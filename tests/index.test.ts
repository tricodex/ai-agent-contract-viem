import { afterAll, describe, expect, test, vi } from 'vitest'
import { app } from '../src/index'

// Mock the environment secrets
const mockSecrets = JSON.stringify({
    privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
})
vi.stubEnv('secret', mockSecrets)

// Mock the SignProtocolClient
vi.mock("@ethsign/sp-sdk", () => ({
    SignProtocolClient: vi.fn().mockImplementation(() => ({
        createAttestation: vi.fn().mockResolvedValue({
            attestationId: '0x123',
            transactionHash: '0xabc'
        })
    })),
    SpMode: { OnChain: 'onchain' },
    EvmChains: { gnosisChiado: 'gnosisChiado' }
}))

describe('Viem Sign Agent', () => {
    test('Create Attestation', async () => {
        const resp = await app.request('/create-attestation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schemaId: '0x1',
                jobCid: 'QmExample',
                status: 'completed'
            })
        })

        console.log('Response:', resp.status)
        const data = await resp.json()
        console.log('Data:', data)
        expect(resp.status).toBe(200)
        expect(data).toHaveProperty('success', true)
        expect(data).toHaveProperty('attestation')
        expect(data.attestation).toHaveProperty('attestationId')
        expect(data.attestation).toHaveProperty('transactionHash')
    })

    test('Error Handling - Missing Private Key', async () => {
        vi.stubEnv('secret', '{}')

        const resp = await app.request('/create-attestation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schemaId: '0x1',
                jobCid: 'QmExample',
                status: 'completed'
            })
        })

        console.log('Response:', resp.status)
        const data = await resp.json()
        console.log('Data:', data)
        expect(resp.status).toBe(500)
        expect(data).toHaveProperty('error', 'Private key not found in secrets')
    })
})

afterAll(() => {
    vi.unstubAllEnvs()
    console.log(`\nNow you are ready to publish your agent, add secrets, and interact with your agent in the following steps:\n- Execute: 'npm run publish-agent'\n- Set secrets: 'npm run set-secrets'\n- Go to the url produced by setting the secrets (e.g. https://wapo-testnet.phala.network/ipfs/QmPQJD5zv3cYDRM25uGAVjLvXGNyQf9Vonz7rqkQB52Jae?key=b092532592cbd0cf)`)

})