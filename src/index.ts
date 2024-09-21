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

app.get('/', (c) => c.json({ 
  message: 'Viem Sign Agent is running',
  version: '1.0.0',
  network: 'Gnosis Chiado'
}))

const SchemaDataSchema = z.object({
  jobCid: z.string(),
  status: z.string()
});

const AttestationSchema = z.object({
  jobCid: z.string(),
  status: z.string()
});

function createSignClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.gnosisChiado,
    account: account,
  });
}

async function createSchema(privateKey: string) {
  const client = createSignClient(privateKey);
  
  try {
    const createSchemaRes = await client.createSchema({
      name: "JobStatus",
      data: [
        { name: "jobCid", type: "string" },
        { name: "status", type: "string" }
      ],
    });
    
    console.log("Schema created with ID:", createSchemaRes.schemaId);
    return createSchemaRes.schemaId;
  } catch (error) {
    console.error("Error creating schema:", error);
    throw error;
  }
}

app.post('/create-schema', async (c) => {
  let vault: Record<string, string> = {}
  try {
    vault = JSON.parse(process.env.secret || '')
  } catch (e) {
    console.error('Failed to parse secrets:', e)
    return c.json({ error: "Failed to parse secrets" }, 500)
  }

  const privateKey = vault.privateKey
  if (!privateKey) {
    console.error('Private key not found in secrets')
    return c.json({ error: "Private key not found in secrets" }, 500)
  }

  try {
    const schemaId = await createSchema(privateKey);
    return c.json({ success: true, schemaId });
  } catch (error) {
    console.error('Error creating schema:', error)
    return c.json({ error: "Failed to create schema", details: error instanceof Error ? error.message : String(error) }, 500)
  }
});

app.post('/create-attestation', async (c) => {
  let vault: Record<string, string> = {}
  try {
    vault = JSON.parse(process.env.secret || '')
  } catch (e) {
    console.error('Failed to parse secrets:', e)
    return c.json({ error: "Failed to parse secrets" }, 500)
  }

  const privateKey = vault.privateKey
  if (!privateKey) {
    console.error('Private key not found in secrets')
    return c.json({ error: "Private key not found in secrets" }, 500)
  }

  const schemaId = vault.schemaId
  if (!schemaId) {
    console.error('Schema ID not found in secrets')
    return c.json({ error: "Schema ID not found in secrets" }, 500)
  }

  const client = createSignClient(privateKey);

  try {
    const data = await c.req.json()
    const validatedData = AttestationSchema.parse(data)

    const createAttestationRes: AttestationResult = await client.createAttestation({
      schemaId: schemaId,
      data: { 
        jobCid: validatedData.jobCid, 
        status: validatedData.status 
      },
      indexingValue: validatedData.jobCid,
    })

    return c.json({
      success: true,
      attestation: {
        attestationId: createAttestationRes.attestationId,
      }
    })
  } catch (error) {
    console.error('Error creating attestation:', error)
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input data", details: error.errors }, 400)
    }
    return c.json({ error: "Failed to create attestation", details: error instanceof Error ? error.message : String(error) }, 500)
  }
})

app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: err.message }, 500)
})

export default handle(app)