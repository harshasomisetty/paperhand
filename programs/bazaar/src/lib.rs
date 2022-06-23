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

    pub fn initalize_market(ctx: Context<InitializeMarket>) -> Result<()> {
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
#[instruction(col_creator: Pubkey, col_symbol: String)]
pub struct InitializeMarket<'info> {

    #[account(init, payer = creator, space = std::mem::size_of::<MarketState>())]
    pub market_state: Account<'info, MarketState>,


    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(init, payer = creator, space = 8, seeds = [b"market_auth", market_state.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,


    #[account(init, payer = creator, seeds = [b"market_token_mint".as_ref(), market_state.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_state, mint::freeze_authority = market_state)]
    pub market_mint: Account<'info, Mint>,


    #[account(init, payer = creator, associated_token::mint = market_mint, associated_token::authority = market_auth)]
    pub market_token_fee: Account<'info, TokenAccount>,

    // no idea
    // pub market_token_recipient: Account<'info, TokenAccount>,


    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,

    #[account(init, payer = creator, seeds = [b"token_a".as_ref(), market_state.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Account<'info, TokenAccount>,
    #[account(init, payer = creator, seeds = [b"token_b".as_ref(), market_state.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Account<'info, TokenAccount>,


    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct Swap {
    /* market auth?
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
pub struct MarketState {}
