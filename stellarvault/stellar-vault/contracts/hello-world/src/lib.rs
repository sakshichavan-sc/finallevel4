#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env,
};
use soroban_sdk::token;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    Active,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub id: u64,
    pub depositor: Address,
    pub beneficiary: Address,
    pub arbiter: Address,
    pub amount: i128,
    pub status: EscrowStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Escrow(u64),
    EscrowCount,
    Admin,
    Token,
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // ✅ Initialize contract
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::EscrowCount, &0u64);
    }

    // ✅ Create escrow (deposit funds)
    pub fn create_escrow(
        env: Env,
        depositor: Address,
        beneficiary: Address,
        arbiter: Address,
        amount: i128,
    ) -> u64 {
        depositor.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap();

        let token_client = token::Client::new(&env, &token_address);

        // Transfer funds into contract
        token_client.transfer(
            &depositor,
            &env.current_contract_address(),
            &amount,
        );

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0);

        let escrow_id = count + 1;

        let escrow = Escrow {
            id: escrow_id,
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            arbiter: arbiter.clone(),
            amount,
            status: EscrowStatus::Active,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        env.storage()
            .instance()
            .set(&DataKey::EscrowCount, &escrow_id);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("create")),
            (escrow_id, depositor, beneficiary, amount),
        );

        escrow_id
    }

    // ✅ Release funds to beneficiary
    pub fn release(env: Env, caller: Address, escrow_id: u64) {
        caller.require_auth();

        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap();

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        if caller != escrow.arbiter && caller != escrow.depositor {
            panic!("Unauthorized");
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap();

        let token_client = token::Client::new(&env, &token_address);

        // Transfer to beneficiary
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.beneficiary,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Released;

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("release")),
            (escrow_id, escrow.beneficiary, escrow.amount),
        );
    }

    // ✅ Refund funds to depositor
    pub fn refund(env: Env, caller: Address, escrow_id: u64) {
        caller.require_auth();

        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap();

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        if caller != escrow.arbiter && caller != escrow.beneficiary {
            panic!("Unauthorized");
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap();

        let token_client = token::Client::new(&env, &token_address);

        // Transfer back to depositor
        token_client.transfer(
            &env.current_contract_address(),
            &escrow.depositor,
            &escrow.amount,
        );

        escrow.status = EscrowStatus::Refunded;

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        env.events().publish(
            (symbol_short!("escrow"), symbol_short!("refund")),
            (escrow_id, escrow.depositor, escrow.amount),
        );
    }

    // ✅ Get escrow
    pub fn get_escrow(env: Env, escrow_id: u64) -> Escrow {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap()
    }

    // ✅ Get total count
    pub fn get_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0)
    }
}