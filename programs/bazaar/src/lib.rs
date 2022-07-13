use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke};

use solana_program::{native_token::LAMPORTS_PER_SOL, system_instruction};
// use spl_math::checked_ceil_div::CheckedCeilDiv;

declare_id!("7cysYXNdgFsJJ8mGRszhkNDej9rzKWNMKiAAthYcx8U3");

#[program]
pub mod bazaar {

    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        starting_token_voucher: u64,
        starting_token_sol: u64,
        auth_bump: u8,
    ) -> Result<()> {
        msg!("first transfer");
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_voucher.to_account_info(),
                    to: ctx.accounts.market_voucher.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            starting_token_voucher,
        )?;

        msg!("second transfer");
        invoke(
            &system_instruction::transfer(
                ctx.accounts.user.to_account_info().key,
                ctx.accounts.market_sol.to_account_info().key,
                starting_token_sol,
            ),
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.market_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("minting!");
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.user_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[auth_bump],
                ]],
            ),
            starting_token_voucher,
        )?;

        Ok(())
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        pool_token_amount: u64,
        auth_bump: u8,
    ) -> Result<()> {
        let pool_token_supply = ctx.accounts.market_mint.supply;
        let pool_tokens = &pool_token_amount;

        // amount of tokens currently in market wallets
        let market_voucher_amount = ctx.accounts.market_voucher.amount;
        let market_b_amount = ctx
            .accounts
            .market_sol
            .to_account_info()
            .lamports
            .borrow()
            .checked_div(LAMPORTS_PER_SOL)
            .unwrap();

        // proportion of tokens needed to deposit to get desired pool tokens back
        let token_voucher_amount = pool_tokens
            .checked_mul(market_voucher_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();
        let token_b_amount = pool_tokens
            .checked_mul(market_b_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        msg!("voucher transfer");
        /* TODO didn't check for decimals when calculating token_*_amount to transfer */
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_voucher.to_account_info(),
                    to: ctx.accounts.market_voucher.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            token_voucher_amount,
        )?;

        msg!("lamports transfer");
        invoke(
            &system_instruction::transfer(
                ctx.accounts.user.to_account_info().key,
                ctx.accounts.market_sol.to_account_info().key,
                token_b_amount,
            ),
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.market_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("minting liq toknes");
        // mint tokens to depositor after depositor provides liquidity
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.user_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[auth_bump],
                ]],
            ),
            pool_token_amount,
        )?;

        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u128,
        minimum_amount_out: u128,
        trade_direction: bool,
        auth_bump: u8,
    ) -> Result<()> {
        // TODO figure out how to make this code not repeat
        // just add to account and from account
        // trade direction

        let market_a_amount = ctx.accounts.market_voucher.amount as u128;
        let market_sol_amount = ctx.accounts.market_sol.to_account_info().lamports() as u128;
        // .checked_div(LAMPORTS_PER_SOL)
        // .unwrap() as u128;

        // let user_a_amount = ctx.accounts.user_voucher.amount as u128;
        // let user_sol_amount = ctx.accounts.user.lamports() as u128;
        // .checked_div(LAMPORTS_PER_SOL)
        // .unwrap() as u128;

        msg!("market data: {}, {}", market_a_amount, market_sol_amount);

        let k = market_a_amount * market_sol_amount;

        if trade_direction == true {
            // going from voucher to sol
            msg!("forward");
            let market_diff = market_a_amount.checked_add(amount_in).unwrap();
            let k_diff = k.checked_div(market_diff).unwrap();
            let amount_out = market_sol_amount.checked_sub(k_diff).unwrap();

            msg!(
                "k {}, marketDiff {}, amountIn {}, amountOut {}, minimum out {}",
                k,
                market_diff,
                amount_in,
                amount_out,
                minimum_amount_out
            );
            require!(amount_out > minimum_amount_out, MyError::SlippageError);

            msg!(
                "user bal: {}, {}",
                ctx.accounts.user.to_account_info().lamports(),
                ctx.accounts.user_voucher.amount
            );
            msg!("first transfer");

            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.user_voucher.to_account_info(),
                        to: ctx.accounts.market_voucher.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in as u64,
            )?;
            msg!("second transfer");

            // msg!("transferring lamports");
            **ctx
                .accounts
                .market_sol
                .to_account_info()
                .try_borrow_mut_lamports()? -= amount_out as u64;

            **ctx.accounts.user.try_borrow_mut_lamports()? += amount_out as u64;
        } else {
            //going from voucher to sol
            msg!("reverse");
            let market_diff = market_sol_amount.checked_add(amount_in).unwrap();
            let k_diff = k.checked_div(market_diff).unwrap();
            let amount_out = market_a_amount.checked_sub(k_diff).unwrap();

            msg!(
                "marketDiff {}, amountIn {}, amountOut {}, minimum out {}",
                market_diff,
                amount_in,
                amount_out,
                minimum_amount_out
            );
            msg!("first transfer");

            require!(amount_out > minimum_amount_out, MyError::SlippageError);
            invoke(
                &system_instruction::transfer(
                    ctx.accounts.user.to_account_info().key,
                    ctx.accounts.market_sol.to_account_info().key,
                    amount_in as u64,
                ),
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.market_sol.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            msg!("2nd transfer");
            // transfer amount in tokens
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.market_voucher.to_account_info(),
                        to: ctx.accounts.user_voucher.to_account_info(),
                        authority: ctx.accounts.market_auth.to_account_info(),
                    },
                    &[&[
                        b"market_auth".as_ref(),
                        ctx.accounts.exhibit.to_account_info().key.as_ref(),
                        &[auth_bump],
                    ]],
                ),
                amount_out as u64,
            )?;
        }

        // trade fee into pool
        Ok(())
    }

    pub fn withdraw_liquidity(
        ctx: Context<WithdrawLiquidity>,
        pool_token_amount: u64,
        auth_bump: u8,
    ) -> Result<()> {
        msg!(
            "withdrawing liq: {}, wants {}",
            &ctx.accounts.user_liq.amount,
            &pool_token_amount
        );

        let pool_token_supply = ctx.accounts.market_mint.supply;
        let pool_tokens = &pool_token_amount;

        // amount of tokens currently in market wallets
        let market_voucher_amount = ctx.accounts.market_voucher.amount;
        let market_b_amount = ctx
            .accounts
            .market_sol
            .to_account_info()
            .lamports
            .borrow()
            .checked_div(LAMPORTS_PER_SOL)
            .unwrap();

        let token_voucher_amount = pool_tokens
            .checked_mul(market_voucher_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();
        let token_b_amount = pool_tokens
            .checked_mul(market_b_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        /* TODO didn't check for decimals when calculating token_*_amount to transfer */
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.market_voucher.to_account_info(),
                    to: ctx.accounts.user_voucher.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[auth_bump],
                ]],
            ),
            token_voucher_amount,
        )?;

        **ctx
            .accounts
            .market_sol
            .to_account_info()
            .try_borrow_mut_lamports()? -= token_b_amount as u64;

        **ctx.accounts.user.try_borrow_mut_lamports()? += token_b_amount as u64;

        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    from: ctx.accounts.user_liq.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            pool_token_amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(starting_token_voucher: u64, starting_sol: u64, auth_bump: u8)]
pub struct InitializeMarket<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(init, payer = user, space = 8, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(init, payer = user, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Box<Account<'info, Mint>>,

    #[account(init, payer = user, associated_token::mint = market_mint, associated_token::authority = market_auth)]
    pub market_token_fee: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub voucher_mint: Box<Account<'info, Mint>>,
    // no idea
    // pub market_token_destination: Account<'info, TokenAccount>,
    #[account(init, payer = user, seeds = [b"token_voucher".as_ref(), market_auth.key().as_ref()], token::mint = voucher_mint, token::authority = market_auth, bump)]
    pub market_voucher: Box<Account<'info, TokenAccount>>,
    #[account(init, payer = user, space = 8, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_sol: Account<'info, MarketSol>,

    #[account(mut, associated_token::mint = voucher_mint, associated_token::authority = user)]
    pub user_voucher: Box<Account<'info, TokenAccount>>,

    #[account(init, payer = user, associated_token::mint = market_mint, associated_token::authority = user)]
    pub user_liq: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_token_amount: u64, auth_bump: u8)]
pub struct DepositLiquidity<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump = auth_bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Box<Account<'info, Mint>>,

    // no idea
    // pub market_token_destination: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub voucher_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_voucher".as_ref(), market_auth.key().as_ref()], token::mint = voucher_mint, token::authority = market_auth, bump)]
    pub market_voucher: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_sol: Account<'info, MarketSol>,

    #[account(mut, associated_token::mint = voucher_mint, associated_token::authority = user)]
    pub user_voucher: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = market_mint, associated_token::authority = user)]
    pub user_liq: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[instruction(amount_in: u128, minimum_amount_out: u128, trade_direction: bool, auth_bump: u8)]
#[derive(Accounts)]
pub struct Swap<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut)]
    pub voucher_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_voucher".as_ref(), market_auth.key().as_ref()], token::mint = voucher_mint, token::authority = market_auth, bump)]
    pub market_voucher: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_sol: Account<'info, MarketSol>,

    #[account(mut, associated_token::mint = voucher_mint, associated_token::authority = user)]
    pub user_voucher: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_token_amount: u64, auth_bump: u8)]
pub struct WithdrawLiquidity<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump = auth_bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Box<Account<'info, Mint>>,

    // no idea
    // pub market_token_destination: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub voucher_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_voucher".as_ref(), market_auth.key().as_ref()], token::mint = voucher_mint, token::authority = market_auth, bump)]
    pub market_voucher: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_sol: Account<'info, MarketSol>,

    #[account(mut, associated_token::mint = voucher_mint, associated_token::authority = user)]
    pub user_voucher: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = market_mint, associated_token::authority = user)]
    pub user_liq: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct MarketSol {}

#[error_code]
pub enum MyError {
    #[msg("Market Slippage too high")]
    SlippageError,
}
