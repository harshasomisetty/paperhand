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
        starting_voucher: u64,
        starting_sol: u64,
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
            starting_voucher,
        )?;

        msg!("second transfer");
        invoke(
            &system_instruction::transfer(
                ctx.accounts.user.to_account_info().key,
                ctx.accounts.market_sol.to_account_info().key,
                starting_sol,
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
            starting_voucher,
        )?;

        ctx.accounts.market_auth.initial_sol = starting_sol;

        Ok(())
    }

    pub fn deposit_liquidity(
        ctx: Context<DepositLiquidity>,
        input_voucher_amt: u64,
        auth_bump: u8,
    ) -> Result<()> {
        let input_sol_amt = ctx
            .accounts
            .market_sol
            .to_account_info()
            .lamports()
            .checked_mul(input_voucher_amt)
            .unwrap()
            .checked_div(ctx.accounts.market_voucher.amount)
            .unwrap();

        msg!(
            "transfer vals: input voucher {}, marketVoucher {}, input sol {}, marketSol {}",
            &input_voucher_amt,
            ctx.accounts.market_voucher.amount,
            &input_sol_amt,
            ctx.accounts.market_sol.to_account_info().lamports()
        );

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
            input_voucher_amt,
        )?;

        msg!("lamports transfer");
        invoke(
            &system_instruction::transfer(
                ctx.accounts.user.to_account_info().key,
                ctx.accounts.market_sol.to_account_info().key,
                input_sol_amt,
            ),
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.market_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("minting liq toknes");
        // mint equal number of LP tokens as deposited vouchers
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
            input_voucher_amt,
        )?;

        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64,
        trade_direction: bool,
        auth_bump: u8,
    ) -> Result<()> {
        let market_voucher = ctx.accounts.market_voucher.amount;
        let market_sol = ctx.accounts.market_sol.to_account_info().lamports();
        let k = market_voucher * market_sol;

        msg!("market data: {}, {}", market_voucher, market_sol);

        if trade_direction == true {
            //Trading vouchers to sol
            msg!("forward");
            let market_diff = market_voucher.checked_add(amount_in).unwrap();
            let k_diff = k.checked_div(market_diff).unwrap();
            let amount_out = market_sol.checked_sub(k_diff).unwrap();

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
            //going from sol to voucher
            msg!("reverse");
            let market_diff = market_sol.checked_add(amount_in).unwrap();
            let k_diff = k.checked_div(market_diff).unwrap();
            let amount_out = market_voucher.checked_sub(k_diff).unwrap();

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
        let market_sol_amount = ctx
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
        let token_sol_amount = pool_tokens
            .checked_mul(market_sol_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        msg!("transferring vouchers to user");
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

        msg!("transferring lamports to user");
        **ctx
            .accounts
            .market_sol
            .to_account_info()
            .try_borrow_mut_lamports()? -= token_sol_amount as u64;

        **ctx.accounts.user.try_borrow_mut_lamports()? += token_sol_amount as u64;

        msg!("burning liq tokens");
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
#[instruction(starting_voucher: u64, starting_sol: u64, auth_bump: u8)]
pub struct InitializeMarket<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    #[account(init, payer = user, space = 8+std::mem::size_of::<MarketInfo>(), seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: Account<'info, MarketInfo>,

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
    pub market_sol: Account<'info, SolWallet>,

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
#[instruction(input_voucher_amt: u64, auth_bump: u8)]
pub struct DepositLiquidity<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump = auth_bump)]
    pub market_auth: Account<'info, MarketInfo>,

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
    pub market_sol: Account<'info, SolWallet>,

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

#[instruction(amount_in: u64, minimum_amount_out: u64, trade_direction: bool, auth_bump: u8)]
#[derive(Accounts)]
pub struct Swap<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: Account<'info, MarketInfo>,

    #[account(mut)]
    pub voucher_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_voucher".as_ref(), market_auth.key().as_ref()], token::mint = voucher_mint, token::authority = market_auth, bump)]
    pub market_voucher: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_sol: Account<'info, SolWallet>,

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
    pub market_auth: Account<'info, MarketInfo>,

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
    pub market_sol: Account<'info, SolWallet>,

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
pub struct MarketInfo {
    pub initial_sol: u64,
}

#[account]
#[derive(Default)]
pub struct SolWallet {}

#[error_code]
pub enum MyError {
    #[msg("Market Slippage too high")]
    SlippageError,
}
