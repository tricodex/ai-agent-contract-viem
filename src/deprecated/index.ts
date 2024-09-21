// src/index.ts
import '@phala/wapo-env'
import { Hono } from 'hono/tiny'
import { handle } from '@phala/wapo-env/guest'
import { cors } from 'hono/cors'
import { privateKeyToAccount } from 'viem/accounts'
import { SignProtocolClient, SpMode, EvmChains, AttestationResult } from "@ethsign/sp-sdk"
import { z } from 'zod'

export const app = new Hono()

app.use('*', cors())

const SchemaDataSchema = z.object({
  jobCid: z.string(),
  status: z.string()
})

const AttestationSchema = z.object({
  jobCid: z.string(),
  status: z.string()
})

function createSignClient(privateKey: string) {
  console.log('Creating Sign Protocol client')
  try {
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
    const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`)
    console.log('Account created:', account.address)
    return new SignProtocolClient(SpMode.OnChain, {
      chain: EvmChains.gnosisChiado,
      account: account,
    })
  } catch (error) {
    console.error('Error creating Sign Protocol client:', error)
    throw error
  }
}

async function createSchema(privateKey: string) {
  console.log('Creating schema')
  const client = createSignClient(privateKey)
  try {
    const createSchemaRes = await client.createSchema({
      name: "JobStatus",
      data: [
        { name: "jobCid", type: "string" },
        { name: "status", type: "string" }
      ],
    })
    console.log("Schema created with ID:", createSchemaRes.schemaId)
    return createSchemaRes.schemaId
  } catch (error) {
    console.error("Error creating schema:", error)
    throw error
  }
}

app.get('/', (c) => {
  console.log('GET request received at root')
  return c.json({
    message: 'Viem Sign Agent is running',
    version: '1.0.0',
    network: 'Gnosis Chiado'
  })
})

app.post('/', async (c) => {
  console.log('POST request received')
  
  const action = c.req.query('action')
  console.log('Action:', action)

  let vault: Record<string, string> = {}
  
  try {
    console.log('Parsing secrets from environment')
    const secretEnv = process.env.secret
    if (!secretEnv) {
      throw new Error('No secrets found in environment')
    }
    vault = JSON.parse(secretEnv)
    console.log('Secrets parsed successfully')
  } catch (e) {
    console.error('Failed to parse secrets:', e)
    return c.json({ error: "Failed to parse secrets", details: e instanceof Error ? e.message : String(e) }, 500)
  }

  const privateKey = vault.privateKey
  if (!privateKey) {
    console.error('Private key not found in secrets')
    return c.json({ error: "Private key not found in secrets" }, 500)
  }
  console.log('Private key found in secrets')

  if (action === 'create-schema') {
    console.log('Creating schema')
    try {
      const schemaId = await createSchema(privateKey)
      console.log('Schema created successfully')
      vault.schemaId = schemaId
      process.env.secret = JSON.stringify(vault)
      return c.json({ success: true, schemaId })
    } catch (error) {
      console.error('Error creating schema:', error)
      return c.json({ error: "Failed to create schema", details: error instanceof Error ? error.message : String(error) }, 500)
    }
  } 
  else if (action === 'create-attestation') {
    console.log('Creating attestation')
    const schemaId = vault.schemaId
    if (!schemaId) {
      console.error('Schema ID not found in secrets')
      return c.json({ error: "Schema ID not found in secrets. Please create a schema first." }, 400)
    }
    console.log('Schema ID found:', schemaId)

    try {
      const client = createSignClient(privateKey)
      console.log('Parsing request body')
      const rawData = await c.req.json()
      console.log('Request body:', JSON.stringify(rawData))
      
      console.log('Validating data')
      const validatedData = AttestationSchema.parse(rawData)
      console.log('Data validated:', JSON.stringify(validatedData))

      console.log('Creating attestation')
      const createAttestationRes: AttestationResult = await client.createAttestation({
        schemaId: schemaId,
        data: {
          jobCid: validatedData.jobCid,
          status: validatedData.status
        },
        indexingValue: validatedData.jobCid,
      })
      console.log('Attestation created:', createAttestationRes.attestationId)

      return c.json({
        success: true,
        attestation: {
          attestationId: createAttestationRes.attestationId,
        }
      })
    } catch (error) {
      console.error('Error creating attestation:', error)
      if (error instanceof z.ZodError) {
        console.error('Zod validation error:', JSON.stringify(error.errors))
        return c.json({ error: "Invalid input data", details: error.errors }, 400)
      }
      return c.json({ error: "Failed to create attestation", details: error instanceof Error ? error.message : String(error) }, 500)
    }
  } else {
    console.error('Invalid action:', action)
    return c.json({ error: "Invalid action" }, 400)
  }
})

app.onError((err, c) => {
  console.error('Global error handler caught an error:', err)
  return c.json({ error: "An internal server error occurred" }, 500)
})

export default handle(app)