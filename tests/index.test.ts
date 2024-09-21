// // tests/index.test.ts
// // tests/index.test.ts
// import { afterAll, describe, expect, test, vi } from 'vitest'
// import { app } from '../src/index'

// // Mock environment variables
// const mockPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
// const mockSchemaId = '0x9876543210987654321098765432109876543210'
// const mockSecret = JSON.stringify({
//   privateKey: mockPrivateKey,
//   schemaId: mockSchemaId
// })
// vi.stubEnv('secret', mockSecret)

// // Mock SignProtocolClient
// vi.mock("@ethsign/sp-sdk", () => ({
//   SignProtocolClient: vi.fn().mockImplementation(() => ({
//     createSchema: vi.fn().mockResolvedValue({ schemaId: mockSchemaId }),
//     createAttestation: vi.fn().mockResolvedValue({ attestationId: '0xabcdef1234567890' }),
//   })),
//   SpMode: { OnChain: 'OnChain' },
//   EvmChains: { gnosisChiado: 'gnosisChiado' },
// }))

// describe('Test Viem Sign Agent Contract', () => {
//   test('Root endpoint', async () => {
//     const resp = await app.request('/')
//     expect(resp.status).toBe(200)
//     const data = await resp.json()
//     expect(data).toHaveProperty('message', 'Viem Sign Agent is running')
//     expect(data).toHaveProperty('version', '1.0.0')
//     expect(data).toHaveProperty('network', 'Gnosis Chiado')
//   })

//   test('Create Schema', async () => {
//     const resp = await app.request('/?action=create-schema', {
//       method: 'POST',
//     })
//     expect(resp.status).toBe(200)
//     const data = await resp.json()
//     expect(data).toHaveProperty('success', true)
//     expect(data).toHaveProperty('schemaId', mockSchemaId)
//   })

//   test('Create Attestation', async () => {
//     const resp = await app.request('/?action=create-attestation', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         jobCid: 'Qm1234567890abcdef',
//         status: 'completed',
//       }),
//     })
//     expect(resp.status).toBe(200)
//     const data = await resp.json()
//     expect(data).toHaveProperty('success', true)
//     expect(data).toHaveProperty('attestation')
//     expect(data.attestation).toHaveProperty('attestationId', '0xabcdef1234567890')
//   })

//   test('Create Attestation with Invalid Data', async () => {
//     const resp = await app.request('/?action=create-attestation', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         invalidField: 'invalid data',
//       }),
//     })
//     expect(resp.status).toBe(400)
//     const data = await resp.json()
//     expect(data).toHaveProperty('error', 'Invalid input data')
//   })

//   test('Invalid Action', async () => {
//     const resp = await app.request('/?action=invalid-action', {
//       method: 'POST',
//     })
//     expect(resp.status).toBe(400)
//     const data = await resp.json()
//     expect(data).toHaveProperty('error', 'Invalid action')
//   })
// })

// afterAll(() => {
//   console.log('\nTests completed. Remember to deploy your agent and set up the schema before using it.')
// })