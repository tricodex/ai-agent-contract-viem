// src/index.ts
import '@phala/wapo-env'
import { Hono } from 'hono/tiny'
import { handle } from '@phala/wapo-env/guest'
import { cors } from 'hono/cors'
import { privateKeyToAccount } from 'viem/accounts'
import { SignProtocolClient, SpMode, EvmChains, AttestationResult } from "@ethsign/sp-sdk"
import { z } from 'zod'

const app = new Hono()

app.use('*', cors())

const AttestationSchema = z.object({
  jobCid: z.string(),
  status: z.string()
})

type Vault = {
  privateKey: string;
  schemaId?: string;
}

let vault: Vault | null = null;

function createSignClient(privateKey: string): SignProtocolClient {
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`)
  return new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.gnosisChiado,
    account: account,
  })
}

async function initializeVault(): Promise<void> {
  if (vault) return;

  try {
    const secretEnv = process.env.secret
    if (!secretEnv) {
      throw new Error('No secrets found in environment')
    }
    vault = JSON.parse(secretEnv) as Vault
    if (!vault.privateKey) {
      throw new Error('Private key not found in secrets')
    }
  } catch (e) {
    throw new Error(`Failed to initialize vault: ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function createSchema(): Promise<string> {
  if (!vault) throw new Error('Vault not initialized')
  const client = createSignClient(vault.privateKey)
  const createSchemaRes = await client.createSchema({
    name: "JobStatus",
    data: [
      { name: "jobCid", type: "string" },
      { name: "status", type: "string" }
    ],
  })
  vault.schemaId = createSchemaRes.schemaId
  process.env.secret = JSON.stringify(vault)
  return createSchemaRes.schemaId
}

app.get('/', (c) => {
  return c.json({
    message: 'Viem Sign Agent is running',
    version: '1.0.0',
    network: 'Gnosis Chiado'
  })
})

app.post('/', async (c) => {
  try {
    await initializeVault()
    if (!vault) throw new Error('Failed to initialize vault')

    const action = c.req.query('action')

    if (action === 'create-schema') {
      const schemaId = await createSchema()
      return c.json({ success: true, schemaId })
    } 
    else if (action === 'create-attestation') {
      if (!vault.schemaId) {
        return c.json({ error: "Schema ID not found. Please create a schema first." }, 400)
      }

      const rawData = await c.req.json()
      const validatedData = AttestationSchema.parse(rawData)

      const client = createSignClient(vault.privateKey)
      const createAttestationRes: AttestationResult = await client.createAttestation({
        schemaId: vault.schemaId,
        data: validatedData,
        indexingValue: validatedData.jobCid,
      })

      return c.json({
        success: true,
        attestation: {
          attestationId: createAttestationRes.attestationId,
        }
      })
    } else {
      return c.json({ error: "Invalid action" }, 400)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input data", details: error.errors }, 400)
    }
    return c.json({ error: "An error occurred", details: error instanceof Error ? error.message : String(error) }, 500)
  }
})

export default handle(app)