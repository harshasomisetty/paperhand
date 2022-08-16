use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use exhibition::state::metaplex_anchor::TokenMetadata;
use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke, system_instruction};

pub mod state;

declare_id!("4mSuHN8AW1z7Y4NFpS4jDc6DvNxur6qH8mbPMz5oHLiS");

#[program]
pub mod carnival {
    use super::*;

    pub fn initialize_carnival(ctx: Context<InitializeCarnival>) -> Result<()> {
        // Init pool structure
        // Init bid structure
        // Init ask structure
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<DepositSol>) -> Result<()> {
        // If Pool not exists, create pool, add to pool structure
        // Insert Sol (transfer from user to pool)
        // recalculate bids and asks
        // insert new bids and asks into quote structures

        // TODO Differentiate between one owner's multiple pools
        Ok(())
    }

    pub fn deposit_nft(ctx: Context<DepositNft>, carnival_auth_bump: u8) -> Result<()> {
        // If Pool not exists, create pool, add to pool structure
        // Insert NFT (transfer from user to pool)
        // Change delegate stuff to prev owner

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.nft_user_token.to_account_info(),
                    to: ctx.accounts.nft_artifact.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            1,
        )?;

        anchor_spl::token::approve(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Approve {
                    to: ctx.accounts.nft_artifact.to_account_info(),
                    delegate: ctx.accounts.signer.to_account_info(),
                    authority: ctx.accounts.carnival_auth.to_account_info(),
                },
                &[&[
                    b"carnival_auth".as_ref(),
                    ctx.accounts.carnival.to_account_info().key.as_ref(),
                    &[carnival_auth_bump],
                ]],
            ),
            1,
        )?;

        Ok(())
    }

    pub fn trade_sol(ctx: Context<TradeSol>) -> Result<()> {
        // If specific, find pools nft belongs to
        // If any, loop through pools to find cheapest price

        // transfer sol from user to carnival
        // transfer nft from carnival to user (or to escrow dll structure?)

        // recalculate bids and asks

        // TODO consider if I need an generic function
        // TODO robust swaps so that trade only happens if enough sol?
        Ok(())
    }

    pub fn trade_nft(ctx: Context<TradeNft>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        // Withdraw sol to user
        // withdraw nfts to user
        // If both sides are empty of assets, delete pool objects
        // Update quote structures
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCarnival<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    /// CHECK: just reading pubkey
    pub carnival: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        space = std::mem::size_of::<SolWallet>() + 8,
        seeds = [b"carnival_auth", carnival.key().as_ref()],
        bump
    )]
    pub carnival_auth: Account<'info, SolWallet>,

    #[account(
        init,
        payer = signer,
        space = std::mem::size_of::<SolWallet>() + 8,
        seeds = [b"escrow_sol", exhibit.key().as_ref()],
        bump
    )]
    pub escrow_sol: Account<'info, SolWallet>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(carnival_auth_bump: u8)]
pub struct DepositNft<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    // #[account(mut)]
    // pub carnival: Account<'info, CarnivalAccount>,
    /// CHECK: just reading pubkey
    pub carnival: AccountInfo<'info>,

    // #[account(mut)]
    // pub carnival: Account<'info, CarnivalAccount>,
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump=carnival_auth_bump)]
    pub carnival_auth: Account<'info, SolWallet>,

    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,
    #[account(mut)]
    pub nft_user_token: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = signer,
        seeds = [b"nft_artifact".as_ref(), exhibit.key().as_ref(), nft_mint.key().as_ref()],
        token::mint = nft_mint,
        token::authority = carnival_auth,
        bump
    )]
    pub nft_artifact: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct TradeSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TradeNft<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
#[repr(C)]
pub struct CarnivalAccount {
    //     pub pools: LinkedList,
    //     pub bids:,
    //     pub asks:,
}

#[account]
#[derive(Default)]
pub struct SolWallet {}
