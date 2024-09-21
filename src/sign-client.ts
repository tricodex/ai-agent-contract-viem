// src/sign-client.ts
import { SignProtocolClient, SpMode, EvmChains } from "@ethsign/sp-sdk";
import { privateKeyToAccount } from "viem/accounts";

export function createSignClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return new SignProtocolClient(SpMode.OnChain, {
    chain: EvmChains.gnosisChiado,
    account: account,
  });
}