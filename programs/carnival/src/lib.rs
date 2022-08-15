use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod carnival {
    use super::*;

    pub fn initialize_carnival(ctx: Context<InitializeCarnival>) -> Result<()> {
        Ok(())
    }

    pub fn list_pool(ctx: Context<ListPool>) -> Result<()> {
        Ok(())
    }

    pub fn trade_sol(ctx: Context<TradeSol>) -> Result<()> {
        Ok(())
    }

    pub fn trade_nft(ctx: Context<TradeNft>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCarnival {}

#[derive(Accounts)]
pub struct ListPool {}

#[derive(Accounts)]
pub struct TradeSol {}

#[derive(Accounts)]
pub struct TradeNft {}

#[derive(Accounts)]
pub struct WithdrawFunds {}



#[account(zero_copy)]
#[repr(C)]
pub struct CarnivalAccount {
    pub pools: LinkedList,
    pub bids:,
    pub asks:,
}
