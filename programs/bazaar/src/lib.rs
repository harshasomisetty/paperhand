use anchor_lang::prelude::*;

declare_id!("6Duew5DzYuBMvRPXTXRML2wvp2EvdPKgBofKhUwxHGQi");

#[program]
pub mod bazaar {
    use super::*;

    pub fn swap(ctx: Context<Swap>) -> Result<()> {
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>) -> Result<()> {
        Ok(())
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>) -> Result<()> {

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Swap {}

#[derive(Accounts)]
pub struct AddLiquidity {}

#[derive(Accounts)]
pub struct RemoveLiquidity {}
