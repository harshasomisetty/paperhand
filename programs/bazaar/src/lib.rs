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

        ctx.accounts.market_auth.fees_paid = 0;

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

        msg!("minting liq tokens");
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
        vouchers: u64,
        buy_vouchers: bool,
        auth_bump: u8,
    ) -> Result<()> {
        let market_voucher = ctx.accounts.market_voucher.amount;
        let market_sol = ctx.accounts.market_sol.to_account_info().lamports();
        let k = market_voucher * market_sol;

        msg!("market data: {}, {}", market_voucher, market_sol);

        if buy_vouchers {
            //Buy Vouchers for Sol
            msg!("forward");
            let market_diff = market_voucher.checked_sub(vouchers).unwrap();
            let k_diff = k.checked_div(market_diff).unwrap();
            let amount_out = k_diff.checked_sub(market_sol).unwrap();

            msg!(
                "k {}, marketDiff {}, vouchers in {}, amountOut {}",
                k,
                market_diff,
                vouchers,
                amount_out,
            );

            msg!("first transfer");

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
                vouchers as u64,
            )?;

            msg!("2nd transfer");
            invoke(
                &system_instruction::transfer(
                    ctx.accounts.user.to_account_info().key,
                    ctx.accounts.market_sol.to_account_info().key,
                    amount_out as u64,
                ),
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.market_sol.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            msg!("fees");
            invoke(
                &system_instruction::transfer(
                    ctx.accounts.user.to_account_info().key,
                    ctx.accounts.market_sol.to_account_info().key,
                    amount_out
                        .checked_mul(500)
                        .unwrap()
                        .checked_div(10000)
                        .unwrap() as u64,
                ),
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.market_sol.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            ctx.accounts.market_auth.fees_paid = ctx.accounts.market_auth.fees_paid
                + amount_out
                    .checked_mul(500)
                    .unwrap()
                    .checked_div(10000)
                    .unwrap() as u64;
        } else {
            // TODO consider the case when user is withdrawing more vouchers than there are in the pool?

            msg!("reverse");
            //Sell Vouchers for sol
            let market_diff = market_voucher.checked_add(vouchers).unwrap();
            let k_diff = k.checked_div(market_diff).unwrap();
            let amount_out = market_sol.checked_sub(k_diff).unwrap();

            msg!(
                "k {}, marketDiff {}, vouchers in {}, amountOut {}",
                k,
                market_diff,
                vouchers,
                amount_out,
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
                vouchers as u64,
            )?;
            msg!("second transfer");

            **ctx
                .accounts
                .market_sol
                .to_account_info()
                .try_borrow_mut_lamports()? -= (amount_out
                .checked_mul(9500)
                .unwrap()
                .checked_div(10000)
                .unwrap()) as u64;

            **ctx.accounts.user.try_borrow_mut_lamports()? += (amount_out
                .checked_mul(9500)
                .unwrap()
                .checked_div(10000)
                .unwrap()) as u64;

            msg!("fees");
            **ctx
                .accounts
                .market_sol
                .to_account_info()
                .try_borrow_mut_lamports()? -= (amount_out
                .checked_mul(500)
                .unwrap()
                .checked_div(10000)
                .unwrap()) as u64;

            **ctx.accounts.creator.try_borrow_mut_lamports()? += (amount_out
                .checked_mul(500)
                .unwrap()
                .checked_div(10000)
                .unwrap()) as u64;

            ctx.accounts.market_auth.fees_paid = ctx.accounts.market_auth.fees_paid
                + amount_out
                    .checked_mul(500)
                    .unwrap()
                    .checked_div(10000)
                    .unwrap() as u64;
        }
        // trade fee into pool
        Ok(())
    }

    pub fn withdraw_liquidity(
        ctx: Context<WithdrawLiquidity>,
        user_liq_tokens: u64,
        user_vouchers: u64,
        auth_bump: u8,
    ) -> Result<()> {
        msg!(
            "withdrawing liq: {}, wants {}",
            &user_liq_tokens,
            &user_vouchers
        );

        require!(user_liq_tokens >= user_vouchers, MyError::WithdrawError);

        let liq_token_value = ctx
            .accounts
            .market_sol
            .to_account_info()
            .lamports()
            .checked_div(ctx.accounts.market_mint.supply)
            .unwrap();

        let user_liq_value = user_liq_tokens.checked_mul(liq_token_value).unwrap();
        let user_voucher_value = user_vouchers.checked_mul(liq_token_value).unwrap();

        let user_receives_sol = user_liq_value.checked_sub(user_voucher_value).unwrap();

        msg!(
            "data: market sol {}, market mint supply {}, liq_value {}, user_liq_value {}, user_voucher_value {}, user sol {}, user liq tokens {}, prev user liq tokens {}",
            ctx.accounts.market_sol.to_account_info().lamports(),
            ctx.accounts.market_mint.supply,
            liq_token_value,
            user_liq_value,
            user_voucher_value,
            user_receives_sol,
            user_liq_tokens,
            ctx.accounts.user_liq.amount
        );

        msg!("burning liq tokens");

        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.market_mint.to_account_info().clone(),
                    from: ctx.accounts.user_liq.to_account_info().clone(),
                    authority: ctx.accounts.user.to_account_info().clone(),
                },
            ),
            user_liq_tokens,
        )?;

        msg!("transferring vouchers to user");

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
            user_vouchers,
        )?;

        msg!("transferring lamports to user");

        **ctx
            .accounts
            .market_sol
            .to_account_info()
            .try_borrow_mut_lamports()? -= user_receives_sol;

        **ctx.accounts.user.try_borrow_mut_lamports()? += user_receives_sol;

        msg!("finsihed withdrawing liq!");

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

    #[account(init, payer = user, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 0, mint::authority = market_auth, mint::freeze_authority = market_auth)]
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

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 0, mint::authority = market_auth, mint::freeze_authority = market_auth)]
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

#[instruction(vouchers: u64, buy_vouchers: bool, auth_bump: u8)]
#[derive(Accounts)]
pub struct Swap<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: Account<'info, MarketInfo>,

    #[account(mut)]
    pub voucher_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_voucher".as_ref(), market_auth.key().as_ref()], token::mint = voucher_mint, token::authority = market_auth, bump)]
    pub market_voucher: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_sol: Account<'info, SolWallet>,

    #[account(mut, associated_token::mint = voucher_mint, associated_token::authority = user)]
    pub user_voucher: Box<Account<'info, TokenAccount>>,

    /// CHECK: sending lamports
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(user_liq_tokens: u64, user_vouchers: u64, auth_bump: u8)]
pub struct WithdrawLiquidity<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump = auth_bump)]
    pub market_auth: Account<'info, MarketInfo>,

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 0, mint::authority = market_auth, mint::freeze_authority = market_auth)]
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
    pub fees_paid: u64,
}

#[account]
#[derive(Default)]
pub struct SolWallet {}

#[error_code]
pub enum MyError {
    #[msg("Withdrawing too many vouchers tokens")]
    WithdrawError,
}
