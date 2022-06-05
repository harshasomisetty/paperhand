use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod nftswap {
    use super::*;

    pub fn swap(ctx: Context<Swap>) -> Result<()> {
        // do i need a buy and sell function?

        Ok(())
    }

    pub fn add_liquidity(ctx: Context<Add_Liquidity>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw_liquidity(ctx: Context<Withdraw_Liquidity>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Swap {}

#[derive(Accounts)]
pub struct Add_Liquidity {}

#[derive(Accounts)]
pub struct Withdraw_Liquidity {}

// TODO where the lp and redeem tokens are generated and stored in pools
// TODO 
