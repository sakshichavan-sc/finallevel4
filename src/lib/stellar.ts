import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  rpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

const ESCROW_CONTRACT_ID = "CAJV7EFWQFV5SZVUYYZE2WW55H6YJKEVTUZ7PVCRE2L2A7SJJSV5BS45";
const TOKEN_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

export const server = new rpc.Server(SOROBAN_RPC_URL);
export const escrowContract = new Contract(ESCROW_CONTRACT_ID);
export const tokenContract = new Contract(TOKEN_CONTRACT_ID);

// Keep backward compat
export const contract = escrowContract;
export const CONTRACT_ID = ESCROW_CONTRACT_ID;

export { ESCROW_CONTRACT_ID, TOKEN_CONTRACT_ID, NETWORK_PASSPHRASE, SOROBAN_RPC_URL };

export type EscrowStatus = "Active" | "Released" | "Refunded";

export interface Escrow {
  id: number;
  depositor: string;
  beneficiary: string;
  arbiter: string;
  amount: number;
  status: EscrowStatus;
  created_at: number;
}

function parseEscrowStatus(val: any): EscrowStatus {
  if (typeof val === "string") return val as EscrowStatus;
  if (val && typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length > 0) return keys[0] as EscrowStatus;
  }
  return "Active";
}

function parseEscrow(result: any): Escrow {
  if (!result) throw new Error("No result");
  return {
    id: Number(result.id ?? result.id_),
    depositor: result.depositor?.toString?.() ?? result.depositor,
    beneficiary: result.beneficiary?.toString?.() ?? result.beneficiary,
    arbiter: result.arbiter?.toString?.() ?? result.arbiter,
    amount: Number(result.amount),
    status: parseEscrowStatus(result.status),
    created_at: Number(result.created_at),
  };
}

export async function buildTransaction(
  publicKey: string,
  method: string,
  params: xdr.ScVal[],
  contractInstance: Contract = escrowContract
) {
  const account = await server.getAccount(publicKey);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contractInstance.call(method, ...params))
    .setTimeout(300)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${(simulated as any).error}`);
  }
  const prepared = rpc.assembleTransaction(tx, simulated).build();
  return prepared;
}

export async function submitTransaction(signedXdr: string) {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(tx);

  if (result.status === "ERROR") {
    throw new Error(`Transaction failed: ${result.status}`);
  }

  let response = await server.getTransaction(result.hash);
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    response = await server.getTransaction(result.hash);
  }

  if (response.status === "SUCCESS") {
    return { hash: result.hash, response };
  }
  throw new Error(`Transaction failed with status: ${response.status}`);
}

export async function getEscrow(escrowId: number): Promise<Escrow> {
  const dummyKey = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  let acc;
  try {
    acc = await server.getAccount(dummyKey);
  } catch {
    throw new Error("Cannot query contract — RPC issue");
  }

  const tx = new TransactionBuilder(acc, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      escrowContract.call("get_escrow", nativeToScVal(escrowId, { type: "u64" }))
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error("Failed to read escrow");
  }

  const successSim = sim as rpc.Api.SimulateTransactionSuccessResponse;
  if (!successSim.result) throw new Error("No result from simulation");

  const raw = scValToNative(successSim.result.retval);
  return parseEscrow(raw);
}

export async function getEscrowCount(): Promise<number> {
  const dummyKey = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  let acc;
  try {
    acc = await server.getAccount(dummyKey);
  } catch {
    return 0;
  }

  const tx = new TransactionBuilder(acc, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(escrowContract.call("get_count"))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) return 0;
  const successSim = sim as rpc.Api.SimulateTransactionSuccessResponse;
  if (!successSim.result) return 0;
  return Number(scValToNative(successSim.result.retval));
}

// Token approve: must be called before create_escrow so the escrow contract can pull funds
export function approveParams(
  from: string,
  spender: string,
  amount: bigint,
  expirationLedger: number
): xdr.ScVal[] {
  return [
    new Address(from).toScVal(),
    new Address(spender).toScVal(),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(expirationLedger, { type: "u32" }),
  ];
}

export async function approveTokenSpend(
  publicKey: string,
  amount: bigint
): Promise<string> {
  // Set expiration ~1 hour from now (~1200 ledgers at ~5s each)
  const accountInfo = await server.getAccount(publicKey);
  // Use a large expiration ledger to ensure the approval lasts
  const currentLedger = await server.getLatestLedger();
  const expirationLedger = currentLedger.sequence + 10000;

  const params = approveParams(publicKey, ESCROW_CONTRACT_ID, amount, expirationLedger);
  const tx = await buildTransaction(publicKey, "approve", params, tokenContract);
  return tx.toXDR();
}

export function createEscrowParams(
  depositor: string,
  beneficiary: string,
  arbiter: string,
  amountStroops: bigint
): xdr.ScVal[] {
  return [
    new Address(depositor).toScVal(),
    new Address(beneficiary).toScVal(),
    new Address(arbiter).toScVal(),
    nativeToScVal(amountStroops, { type: "i128" }),
  ];
}

export function releaseParams(caller: string, escrowId: number): xdr.ScVal[] {
  return [
    new Address(caller).toScVal(),
    nativeToScVal(escrowId, { type: "u64" }),
  ];
}

export function refundParams(caller: string, escrowId: number): xdr.ScVal[] {
  return [
    new Address(caller).toScVal(),
    nativeToScVal(escrowId, { type: "u64" }),
  ];
}

export function stroopsToXLM(stroops: number): string {
  return (stroops / 10_000_000).toFixed(7);
}

export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * 10_000_000));
}

export function shortenAddress(addr: string, chars = 6): string {
  if (!addr) return "";
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

export function getStellarExplorerUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
