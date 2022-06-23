use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solana_program;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, program::invoke, program::invoke_signed,
    program_option::COption, system_instruction,
};

declare_id!("6Duew5DzYuBMvRPXTXRML2wvp2EvdPKgBofKhUwxHGQi");

#[program]
pub mod bazaar {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        Ok(())
    }

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
pub struct InitializePool<'info> {
   #[account(init, payer = creator, space = std::mem::size_of::<PoolState>())]
    pub pool_state: Box<Account<'info, PoolState>>,


    // need pool auth since can't pass in pool state as a signer
    #[account(mut, seeds = [b"pool_auth", pool_state.key().as_ref()], bump)]
    pub pool_auth: AccountInfo<'info>,


    // TODO do I need to pass in token_a/b mints as well to check?

    #[account(mut, seeds = [b"token_a", pool_state.key().as_ref()], bump)]
    pub pool_token_a: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"token_b", pool_state.key().as_ref()], bump)]
    pub pool_token_b: Account<'info, TokenAccount>,


    #[account(mut, seeds = [b"pool_token_mint", pool_state.key().as_ref()], bump)]
    pub pool_mint: Account<'info, Mint>,


    #[account(mut)]
    pub pool_token_fee: Account<'info, TokenAccount>,

    // no idea
    pub pool_token_recipient: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,


}

#[derive(Accounts)]
pub struct Swap {
    /* pool auth?
     * user source
     * swap source
     * user destination
     * swap destination
     * */
}

#[derive(Accounts)]
pub struct AddLiquidity {}

#[derive(Accounts)]
pub struct RemoveLiquidity {}


#[account]
#[derive(Default)]
pub struct PoolState {}
