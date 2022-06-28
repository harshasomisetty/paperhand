use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke, program::invoke_signed};

use spl_math::checked_ceil_div::CheckedCeilDiv;

declare_id!("C71P9khhQ23ufjqBW6EvtN79CgXT5tPB73LKcTxtPPTC");

#[program]
pub mod bazaar {
    use anchor_lang::system_program::Transfer;

    use super::*;

    pub fn initialize_exhibit(
        ctx: Context<InitializeExhibit>,
        exhibit_creator: Pubkey,
        exhibit_symbol: String,
    ) -> Result<()> {
        let exhibit = &mut ctx.accounts.exhibit;
        exhibit.exhibit_creator = exhibit_creator;
        exhibit.exhibit_symbol = exhibit_symbol;
        exhibit.nft_count = 0;
        exhibit.market_active = false;
        Ok(())
    }

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        starting_token_a: u64,
        starting_token_b: u64,
        exhibit_symbol: String,
        exhibit_bump: u8,
        auth_bump: u8,
    ) -> Result<()> {
        msg!("in init market");
        require!(
            ctx.accounts.creator.to_account_info().key == &ctx.accounts.exhibit.exhibit_creator,
            MyError::ExhibitAndMarketCreatorDiffer
        );

        require!(
            ctx.accounts.creator_token_a.amount > starting_token_a,
            MyError::LackOfFunds
        );
        require!(
            ctx.accounts.creator_token_b.amount > starting_token_b,
            MyError::LackOfFunds
        );

        ctx.accounts.exhibit.auth_bump = auth_bump;
        msg!("first transfer");
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.creator_token_a.to_account_info(),
                    to: ctx.accounts.market_token_a.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            starting_token_a,
        );

        msg!("second transfer");
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.creator_token_b.to_account_info(),
                    to: ctx.accounts.market_token_b.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            starting_token_b,
        );

        msg!("minting!");
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.creator_token_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[ctx.accounts.exhibit.auth_bump],
                ]],
            ),
            starting_token_a,
        )?;

        ctx.accounts.exhibit.market_active = true;

        Ok(())
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        pool_token_amount: u64,
        exhibit_symbol: String,
        exhibit_bump: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.exhibit.market_active == true,
            MyError::MarketNotActive
        );

        let pool_token_supply = u64::try_from(ctx.accounts.market_mint.supply).unwrap();

        let pool_tokens = &pool_token_amount;

        let swap_token_a_amount = u64::try_from(ctx.accounts.market_token_a.amount).unwrap();
        let swap_token_b_amount = u64::try_from(ctx.accounts.market_token_b.amount).unwrap();

        let token_a_amount = pool_tokens
            .checked_mul(swap_token_a_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();
        let token_b_amount = pool_tokens
            .checked_mul(swap_token_b_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        msg!(
            "token amounts: {}, {}",
            &ctx.accounts.provider_token_a.amount,
            &token_a_amount
        );
        require!(
            &ctx.accounts.provider_token_a.amount > &token_a_amount,
            MyError::LackOfFunds
        );
        require!(
            &ctx.accounts.provider_token_b.amount > &token_b_amount,
            MyError::LackOfFunds
        );

        /* TODO didn't check for decimals when calculating token_*_amount to transfer */
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.provider_token_a.to_account_info(),
                    to: ctx.accounts.market_token_a.to_account_info(),
                    authority: ctx.accounts.provider.to_account_info(),
                },
            ),
            token_a_amount,
        );

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.provider_token_b.to_account_info(),
                    to: ctx.accounts.market_token_b.to_account_info(),
                    authority: ctx.accounts.provider.to_account_info(),
                },
            ),
            token_b_amount,
        );

        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.provider_token_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[ctx.accounts.exhibit.auth_bump],
                ]],
            ),
            pool_token_amount,
        )?;

        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        exhibit_symbol: String,
        exhibit_bump: u8,
        trade_direction: bool,
        amount_in: u128,
        minimum_amount_out: u128,
    ) -> Result<()> {
        // TODO trading fee
        // TODO slippage

        let (user_from, user_to, market_from, market_to) = if trade_direction == true {
            (
                &ctx.accounts.swapper_token_a,
                &ctx.accounts.swapper_token_b,
                &ctx.accounts.market_token_a,
                &ctx.accounts.market_token_b,
            )
        } else {
            (
                &ctx.accounts.swapper_token_b,
                &ctx.accounts.swapper_token_a,
                &ctx.accounts.market_token_b,
                &ctx.accounts.market_token_a,
            )
        };

        msg!("test {}", user_from.amount);

        let market_to_amt = market_from.amount as u128;
        let market_from_amt = market_to.amount as u128;

        let user_to_amt = user_from.amount as u128;
        let user_from_amt = user_to.amount as u128;

        let constant = market_to_amt * market_from_amt;
        let market_to_diff = market_to_amt.checked_add(amount_in).unwrap();
        let constant_diff = constant.checked_ceil_div(market_to_diff).unwrap();
        let amount_out = market_from_amt.checked_sub(constant_diff.0).unwrap();

        msg!(
            "market to start: {}, market from start: {}, market to end: {}, amount in: {}, amount out: {}",
            market_to_amt,
            market_from_amt,
            market_to_diff,
            amount_in,
            amount_out
        );

        // transfer amounts

        // transfer amount in tokens
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: user_from.to_account_info(),
                    to: market_from.to_account_info(),
                    authority: ctx.accounts.swapper.to_account_info(),
                },
            ),
            amount_in as u64,
        );

        // transfer amount out tokens
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: market_to.to_account_info(),
                    to: user_to.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[ctx.accounts.exhibit.auth_bump],
                ]],
            ),
            amount_out as u64,
        );

        // trade fee into pool
        Ok(())
    }

    pub fn withdraw_liquidity(
        ctx: Context<WithdrawLiquidity>,
        pool_token_amount: u64,
        exhibit_symbol: String,
        exhibit_bump: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.exhibit.market_active == true,
            MyError::MarketNotActive
        );

        msg!(
            "withdrawing liq: {}, wants {}",
            &ctx.accounts.provider_token_liq.amount,
            &pool_token_amount
        );

        require!(
            &ctx.accounts.provider_token_liq.amount > &pool_token_amount,
            MyError::LackOfFunds
        );
        let pool_token_supply = u64::try_from(ctx.accounts.market_mint.supply).unwrap();
        let pool_tokens = &pool_token_amount;

        let swap_token_a_amount = u64::try_from(ctx.accounts.market_token_a.amount).unwrap();
        let swap_token_b_amount = u64::try_from(ctx.accounts.market_token_b.amount).unwrap();

        let token_a_amount = pool_tokens
            .checked_mul(swap_token_a_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();
        let token_b_amount = pool_tokens
            .checked_mul(swap_token_b_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        msg!(
            "token amounts: {}, {}",
            &ctx.accounts.provider_token_a.amount,
            &token_a_amount
        );

        /* TODO didn't check for decimals when calculating token_*_amount to transfer */
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.market_token_a.to_account_info(),
                    to: ctx.accounts.provider_token_a.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[ctx.accounts.exhibit.auth_bump],
                ]],
            ),
            token_a_amount,
        );

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.market_token_b.to_account_info(),
                    to: ctx.accounts.provider_token_b.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[ctx.accounts.exhibit.auth_bump],
                ]],
            ),
            token_b_amount,
        );

        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    from: ctx.accounts.provider_token_liq.to_account_info(),
                    authority: ctx.accounts.provider.to_account_info(),
                },
            ),
            pool_token_amount,
        )?;

        Ok(())
    }
}

// temp method to use in single Bazaar contract, copied from exhibition contract
#[derive(Accounts)]
#[instruction(exhibit_creator: Pubkey, exhibit_symbol: String)]
pub struct InitializeExhibit<'info> {
    #[account(init, payer = creator, space = std::mem::size_of::<Exhibit>(), seeds = [b"exhibit".as_ref(), exhibit_symbol.as_ref(), exhibit_creator.as_ref()], bump)]
    pub exhibit: Account<'info, Exhibit>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(starting_token_a: u64, starting_token_b:u64, exhibit_symbol: String, exhibit_bump: u8, auth_bump: u8)]
pub struct InitializeMarket<'info> {
    #[account(mut, seeds = [b"exhibit".as_ref(), exhibit_symbol.as_ref(), creator.key().as_ref()], bump = exhibit_bump)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(init, payer = creator, space = 8, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(init, payer = creator, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Box<Account<'info, Mint>>,

    #[account(init, payer = creator, associated_token::mint = market_mint, associated_token::authority = market_auth)]
    pub market_token_fee: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub token_a_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub token_b_mint: Box<Account<'info, Mint>>,
    // no idea
    // pub market_token_destination: Account<'info, TokenAccount>,
    #[account(init, payer = creator, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    #[account(init, payer = creator, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = creator)]
    pub creator_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = token_b_mint, associated_token::authority = creator)]
    pub creator_token_b: Box<Account<'info, TokenAccount>>,

    #[account(init, payer = creator, associated_token::mint = market_mint, associated_token::authority = creator)]
    pub creator_token_liq: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_token_amount: u64, exhibit_symbol: String, exhibit_bump: u8)]
pub struct DepositLiquidity<'info> {
    #[account(mut, seeds = [b"exhibit".as_ref(), exhibit_symbol.as_ref(), creator.key().as_ref()], bump = exhibit_bump)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump = exhibit.auth_bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Box<Account<'info, Mint>>,

    // no idea
    // pub market_token_destination: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub token_a_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub token_b_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = provider)]
    pub provider_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = token_b_mint, associated_token::authority = provider)]
    pub provider_token_b: Box<Account<'info, TokenAccount>>,

    #[account(init_if_needed, payer = provider, associated_token::mint = market_mint, associated_token::authority = provider)]
    pub provider_token_liq: Box<Account<'info, TokenAccount>>,

    /// CHECK: just need the creator pubkey
    pub creator: AccountInfo<'info>,

    #[account(mut)]
    pub provider: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[instruction(exhibit_symbol: String, exhibit_bump: u8, trade_direction: bool, amount_in: u64, minimum_amount_out: u64)]
#[derive(Accounts)]
pub struct Swap<'info> {
    /* market auth?
     * user source
     * swap source
     * user destination
     * swap destination
     * */
    #[account(mut, seeds = [b"exhibit".as_ref(), exhibit_symbol.as_ref(), creator.key().as_ref()], bump = exhibit_bump)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut)]
    pub token_a_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub token_b_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = swapper)]
    pub swapper_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = token_b_mint, associated_token::authority = swapper)]
    pub swapper_token_b: Box<Account<'info, TokenAccount>>,

    /// CHECK: just reading pubkey of creator
    pub creator: AccountInfo<'info>,
    #[account(mut)]
    pub swapper: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_token_amount: u64, exhibit_symbol: String, exhibit_bump: u8)]
pub struct WithdrawLiquidity<'info> {
    #[account(mut, seeds = [b"exhibit".as_ref(), exhibit_symbol.as_ref(), creator.key().as_ref()], bump = exhibit_bump)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump = exhibit.auth_bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Box<Account<'info, Mint>>,

    // no idea
    // pub market_token_destination: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub token_a_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub token_b_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = provider)]
    pub provider_token_a: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = token_b_mint, associated_token::authority = provider)]
    pub provider_token_b: Box<Account<'info, TokenAccount>>,

    #[account(init_if_needed, payer = provider, associated_token::mint = market_mint, associated_token::authority = provider)]
    pub provider_token_liq: Box<Account<'info, TokenAccount>>,

    /// CHECK: just need the creator pubkey
    pub creator: AccountInfo<'info>,

    #[account(mut)]
    pub provider: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Exhibit {
    pub exhibit_creator: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub exhibit_symbol: String,
    pub nft_count: u32,
    pub market_active: bool,
    pub auth_bump: u8,
}

#[error_code]
pub enum MyError {
    #[msg("Exhibit creator is not the same as market initializer")]
    ExhibitAndMarketCreatorDiffer,

    #[msg("Account does not have enough funds")]
    LackOfFunds,

    #[msg("Market not active")]
    MarketNotActive,
}