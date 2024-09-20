// index.ts
import '@phala/wapo-env'
import { Hono } from 'hono/tiny'
import { handle } from '@phala/wapo-env/guest'
import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, http } from 'viem'
import { gnosisChiado } from 'viem/chains'
import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk"

export const app = new Hono()

const publicClient = createPublicClient({
  chain: gnosisChiado,
  transport: http(),
})

const walletClient = createWalletClient({
  chain: gnosisChiado,
  transport: http(),
})

app.post('/create-attestation', async (c) => {
  let vault: Record<string, string> = {}
  try {
    vault = JSON.parse(process.env.secret || '')
  } catch (e) {
    console.error(e)
    return c.json({ error: "Failed to parse secrets" }, 500)
  }

  const privateKey = vault.privateKey
  if (!privateKey) {
    return c.json({ error: "Private key not found in secrets" }, 500)
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const client = new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.gnosisChiado,
    account: account,
  })

  const data = await c.req.json()
  const { schemaId, jobCid, status } = data

  try {
    const createAttestationRes = await client.createAttestation({
      schemaId,
      data: { jobCid, status },
      indexingValue: jobCid,
    })

    return c.json({ success: true, attestation: createAttestationRes })
  } catch (error) {
    console.error('Error creating attestation:', error)
    return c.json({ error: "Failed to create attestation" }, 500)
  }
})

export default handle(app)