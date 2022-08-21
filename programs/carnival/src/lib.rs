use anchor_lang::prelude::*;

pub mod state;

pub mod instructions;
use instructions::*;

declare_id!("4mSuHN8AW1z7Y4NFpS4jDc6DvNxur6qH8mbPMz5oHLiS");

#[program]
pub mod carnival {

    use super::*;

    pub fn initialize_carnival(ctx: Context<InitializeCarnival>) -> Result<()> {
        instructions::carnival::init_carnival(ctx)
    }

    pub fn create_market(
        ctx: Context<InitializeMarket>,
        market_owner: Pubkey,
        market_id: u64,
        curve: u8,
        delta: u8,
        fee: u8,
    ) -> Result<()> {
        instructions::market::create_market(ctx, market_owner, market_id, curve, delta, fee)
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        market_id: u64,
        sol_amt: u64,
        carnival_auth_bump: u8,
        market_bump: u8,
    ) -> Result<()> {
        instructions::deposit::deposit_sol(ctx, market_id, sol_amt, carnival_auth_bump, market_bump)
    }

    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        market_id: u64,
        carnival_auth_bump: u8,
        market_bump: u8,
    ) -> Result<()> {
        instructions::deposit::deposit_nft(ctx, market_id, carnival_auth_bump, market_bump)
    }

    pub fn trade_sol(ctx: Context<TradeSol>) -> Result<()> {
        instructions::trade::trade_sol(ctx)
    }

    pub fn trade_nft(ctx: Context<TradeNft>) -> Result<()> {
        instructions::trade::trade_nft(ctx)
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        market_id: u64,
        sol_amt: u64,
        carnival_auth_bump: u8,
        escrow_auth_bump: u8,
    ) -> Result<()> {
        instructions::withdraw::withdraw_sol(
            ctx,
            market_id,
            sol_amt,
            carnival_auth_bump,
            escrow_auth_bump,
        )
    }

    pub fn withdraw_nft(
        ctx: Context<WithdrawNft>,
        market_id: u64,
        carnival_auth_bump: u8,
        market_bump: u8,
    ) -> Result<()> {
        instructions::withdraw::withdraw_nft(ctx, market_id, carnival_auth_bump, market_bump)
    }

    pub fn close_market(
        ctx: Context<InitializeMarket>,
        market_owner: Pubkey,
        market_id: u64,
        curve: u8,
        delta: u8,
        fee: u8,
    ) -> Result<()> {
        instructions::market::close_market(ctx, market_owner, market_id, curve, delta, fee)
    }
}

// #[constant]
// pub const MAX_ARRAY_SIZE: u64 = 32;
