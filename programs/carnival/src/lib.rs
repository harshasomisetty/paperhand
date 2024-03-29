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

    pub fn create_booth(
        ctx: Context<CreateBooth>,
        booth_owner: Pubkey,
        booth_id: u64,
        spot_price: u64,
        curve: u8,
        booth_type: u8,
        delta: u64,
        fee: u16,
    ) -> Result<()> {
        instructions::booth::create_booth(
            ctx,
            booth_owner,
            booth_id,
            spot_price,
            curve,
            booth_type,
            delta,
            fee,
        )
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        booth_id: u64,
        sol_amt: u64,
        carnival_auth_bump: u8,
        booth_bump: u8,
    ) -> Result<()> {
        instructions::deposit::deposit_sol(ctx, booth_id, sol_amt, carnival_auth_bump, booth_bump)
    }

    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        booth_id: u64,
        carnival_auth_bump: u8,
        booth_bump: u8,
    ) -> Result<()> {
        instructions::deposit::deposit_nft(ctx, booth_id, carnival_auth_bump, booth_bump)
    }

    pub fn trade_sol_for_nft(
        ctx: Context<TradeSolForNft>,
        booth_id: u64,
        carnival_auth_bump: u8,
        booth_bump: u8,
        escrow_auth_bump: u8,
    ) -> Result<()> {
        instructions::soltonft::trade_sol_for_nft(
            ctx,
            booth_id,
            carnival_auth_bump,
            booth_bump,
            escrow_auth_bump,
        )
    }

    pub fn trade_nft_for_sol(
        ctx: Context<TradeNftForSol>,
        booth_id: u64,
        carnival_auth_bump: u8,
        booth_bump: u8,
        escrow_auth_bump: u8,
    ) -> Result<()> {
        instructions::nfttosol::trade_nft_for_sol(
            ctx,
            booth_id,
            carnival_auth_bump,
            booth_bump,
            escrow_auth_bump,
        )
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        booth_id: u64,
        sol_amt: u64,
        carnival_auth_bump: u8,
        escrow_auth_bump: u8,
    ) -> Result<()> {
        instructions::withdraw::withdraw_sol(
            ctx,
            booth_id,
            sol_amt,
            carnival_auth_bump,
            escrow_auth_bump,
        )
    }

    pub fn withdraw_nft(
        ctx: Context<WithdrawNft>,
        booth_id: u64,
        carnival_auth_bump: u8,
        booth_bump: u8,
    ) -> Result<()> {
        instructions::withdraw::withdraw_nft(ctx, booth_id, carnival_auth_bump, booth_bump)
    }

    pub fn close_booth(ctx: Context<CloseBooth>, booth_owner: Pubkey, booth_id: u64) -> Result<()> {
        instructions::booth::close_booth(ctx, booth_owner, booth_id)
    }
}

// #[constant]
// pub const MAX_ARRAY_SIZE: u64 = 32;
