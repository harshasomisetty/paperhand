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
    use solana_program::{native_token::LAMPORTS_PER_SOL, system_instruction};

    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        starting_token_a: u64,
        starting_token_sol: u64,
        auth_bump: u8,
    ) -> Result<()> {
        msg!("first transfer");
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_a.to_account_info(),
                    to: ctx.accounts.market_token_a.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            starting_token_a,
        );

        msg!("second transfer");
        invoke(
            &system_instruction::transfer(
                ctx.accounts.user.to_account_info().key,
                ctx.accounts.market_token_sol.to_account_info().key,
                starting_token_sol,
            ),
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.market_token_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("minting!");
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.user_token_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[auth_bump],
                ]],
            ),
            starting_token_a,
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
        let market_token_a_amount = ctx.accounts.market_token_a.amount;
        let market_token_b_amount = ctx
            .accounts
            .market_token_sol
            .to_account_info()
            .lamports
            .borrow()
            .checked_div(LAMPORTS_PER_SOL)
            .unwrap();

        // proportion of tokens needed to deposit to get desired pool tokens back
        let token_a_amount = pool_tokens
            .checked_mul(market_token_a_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();
        let token_b_amount = pool_tokens
            .checked_mul(market_token_b_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        msg!(
            "token amounts: {}, {}",
            &ctx.accounts.user_token_a.amount,
            &token_a_amount
        );

        /* TODO didn't check for decimals when calculating token_*_amount to transfer */
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_token_a.to_account_info(),
                    to: ctx.accounts.market_token_a.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            token_a_amount,
        );

        invoke(
            &system_instruction::transfer(
                ctx.accounts.user.to_account_info().key,
                ctx.accounts.market_token_sol.to_account_info().key,
                token_b_amount,
            ),
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.market_token_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // mint tokens to depositor after depositor provides liquidity
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.user_token_liq.to_account_info(),
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
        sol_bump: u8,
    ) -> Result<()> {
        // TODO figure out how to make this code not repeat
        // just add to account and from account
        // trade direction

        let market_a_amount = ctx.accounts.market_token_a.amount as u128;
        let market_sol_amount = ctx
            .accounts
            .market_token_sol
            .to_account_info()
            .lamports
            .borrow()
            .checked_div(LAMPORTS_PER_SOL)
            .unwrap() as u128;

        let user_a_amount = ctx.accounts.user_token_a.amount as u128;
        let user_sol_amount = ctx
            .accounts
            .user
            .lamports
            .borrow()
            .checked_div(LAMPORTS_PER_SOL)
            .unwrap() as u128;

        let K = market_a_amount * market_sol_amount;

        if trade_direction == true {
            let market_diff = market_a_amount.checked_add(amount_in).unwrap();
            let K_diff = K.checked_ceil_div(market_diff).unwrap();
            let amount_out = market_sol_amount.checked_sub(K_diff.0).unwrap();

            msg!(
                "marketADiff {}, marketBDiff {}, marketDiff {}, amountOut {}",
                market_diff,
                amount_out,
                market_diff,
                amount_out
            );
            // TODO Add slippage by checking amount_out
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.user_token_a.to_account_info(),
                        to: ctx.accounts.market_token_a.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in as u64,
            );

            invoke_signed(
                &system_instruction::transfer(
                    ctx.accounts.market_token_sol.to_account_info().key,
                    ctx.accounts.user.to_account_info().key,
                    amount_out as u64,
                ),
                &[
                    ctx.accounts.market_token_sol.to_account_info(),
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[&[
                    b"token_sol".as_ref(),
                    ctx.accounts.market_auth.to_account_info().key.as_ref(),
                    &[sol_bump],
                ]],
            )?;
        } else {
            let market_diff = market_sol_amount.checked_add(amount_in).unwrap();
            let K_diff = K.checked_ceil_div(market_diff).unwrap();
            let amount_out = market_a_amount.checked_sub(K_diff.0).unwrap();

            msg!(
                "marketADiff {}, marketBDiff {}, marketDiff {}, amountOut {}",
                market_diff,
                amount_out,
                market_diff,
                amount_out
            );
            invoke(
                &system_instruction::transfer(
                    ctx.accounts.user.to_account_info().key,
                    ctx.accounts.market_token_sol.to_account_info().key,
                    amount_in as u64,
                ),
                &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.market_token_sol.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            // transfer amount in tokens
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.market_token_a.to_account_info(),
                        to: ctx.accounts.user_token_a.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                    &[&[
                        b"market_auth".as_ref(),
                        ctx.accounts.exhibit.to_account_info().key.as_ref(),
                        &[auth_bump],
                    ]],
                ),
                amount_out as u64,
            );
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
            &ctx.accounts.user_token_liq.amount,
            &pool_token_amount
        );

        let pool_token_supply = ctx.accounts.market_mint.supply;
        let pool_tokens = &pool_token_amount;

        // amount of tokens currently in market wallets
        let market_token_a_amount = ctx.accounts.market_token_a.amount;
        let market_token_b_amount = ctx
            .accounts
            .market_token_sol
            .to_account_info()
            .lamports
            .borrow()
            .checked_div(LAMPORTS_PER_SOL)
            .unwrap();

        let token_a_amount = pool_tokens
            .checked_mul(market_token_a_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();
        let token_b_amount = pool_tokens
            .checked_mul(market_token_b_amount)
            .unwrap()
            .checked_div(pool_token_supply)
            .unwrap();

        /* TODO didn't check for decimals when calculating token_*_amount to transfer */
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.market_token_a.to_account_info(),
                    to: ctx.accounts.user_token_a.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[auth_bump],
                ]],
            ),
            token_a_amount,
        );

        invoke_signed(
            &system_instruction::transfer(
                ctx.accounts.market_token_sol.to_account_info().key,
                ctx.accounts.user.to_account_info().key,
                token_b_amount,
            ),
            &[
                ctx.accounts.market_token_sol.to_account_info(),
                ctx.accounts.user.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"market_auth".as_ref(),
                ctx.accounts.exhibit.to_account_info().key.as_ref(),
                &[auth_bump],
            ]],
        );

        anchor_spl::token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Burn {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    from: ctx.accounts.user_token_liq.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            pool_token_amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(starting_token_a: u64, starting_sol: u64, auth_bump: u8)]
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
    pub token_a_mint: Box<Account<'info, Mint>>,
    // no idea
    // pub market_token_destination: Account<'info, TokenAccount>,
    #[account(init, payer = user, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(init, payer = user, space = 8, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_token_sol: AccountInfo<'info>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = user)]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    #[account(init, payer = user, associated_token::mint = market_mint, associated_token::authority = user)]
    pub user_token_liq: Box<Account<'info, TokenAccount>>,

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
    pub token_a_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_token_sol: AccountInfo<'info>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = user)]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = market_mint, associated_token::authority = user)]
    pub user_token_liq: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[instruction(amount_in: u128, minimum_amount_out: u128, trade_direction: bool, auth_bump: u8, sol_bump: u8)]
#[derive(Accounts)]
pub struct Swap<'info> {
    /// CHECK: just reading pubkey
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut)]
    pub token_a_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_token_sol: AccountInfo<'info>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = user)]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

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
    pub token_a_mint: Box<Account<'info, Mint>>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Box<Account<'info, TokenAccount>>,
    /// CHECK: Only transferring lamports
    #[account(mut, seeds = [b"token_sol".as_ref(), market_auth.key().as_ref()], bump)]
    pub market_token_sol: AccountInfo<'info>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = user)]
    pub user_token_a: Box<Account<'info, TokenAccount>>,

    #[account(mut, associated_token::mint = market_mint, associated_token::authority = user)]
    pub user_token_liq: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct MarketSol {}
