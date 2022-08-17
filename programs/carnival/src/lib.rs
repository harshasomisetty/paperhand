use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use exhibition::state::metaplex_anchor::TokenMetadata;
use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke, system_instruction};

mod accounts;
use accounts::{CarnivalAccount, Pool};

pub mod state;
use state::curve::CurveType;

pub mod utils;
// use crate::utils::{
//     creator_single_seed, exhibit_pubkey_gen, exhibit_pubkey_seeds, exhibit_pubkey_verify,
// };

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

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        creator: Pubkey,
        curve: CurveType,
        delta: u8,
        fee: u8,
    ) -> Result<()> {
        let mut pool = &mut ctx.accounts.pool;

        pool.pool_id = ctx.accounts.carnival.pool_id_count;
        pool.creator = creator;
        pool.curve = curve;
        pool.delta = delta;
        pool.fee = fee;

        ctx.accounts.carnival.pool_id_count = ctx.accounts.carnival.pool_id_count + 1;
        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        pool_id: u8,
        sol_to_deposit: u64,
        carnival_auth_bump: u8,
    ) -> Result<()> {
        // Pop node from array

        invoke(
            &system_instruction::transfer(
                ctx.accounts.signer.to_account_info().key,
                ctx.accounts.escrow_sol.to_account_info().key,
                sol_to_deposit,
            ),
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.escrow_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        );

        // recalculate pool offers and type

        // insert pool into correct array

        Ok(())
    }

    pub fn deposit_nft(ctx: Context<DepositNft>, carnival_auth_bump: u8) -> Result<()> {
        // pop node from array

        // 2) Deposit NFT through exhibit
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

        // 3) Update pool object value
        // 4) Insert Pool into correct Array

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

    pub fn withdraw_sol(ctx: Context<WithdrawSol>) -> Result<()> {
        // Withdraw sol to user
        // If both sides are empty of assets, delete pool objects
        // Update quote structures
        Ok(())
    }

    pub fn withdraw_nfts(ctx: Context<WithdrawNfts>) -> Result<()> {
        // Withdraw sol to user
        // If both sides are empty of assets, delete pool objects
        // Update quote structures
        Ok(())
    }

    // Eviction policy. can only insert new pool.s if the total pool lenght is less than the max. if over the max, need to make srue that the worst pool on the bid side or ask side is
    // should mark the pool as evicted so no one can add to it anymore. Then move out all the NFTs and sol in one transaction. In loop so all the nfts are moved.
    //
    // then in the offer arrays, need to pop
    pub fn evict_sol(ctx: Context<EvictSol>) -> Result<()> {
        // Evict sol to user
        // If both sides are empty of assets, delete pool objects
        // Update quote structures
        Ok(())
    }

    pub fn evict_nfts(ctx: Context<EvictNfts>) -> Result<()> {
        // Evict sol to user
        // If both sides are empty of assets, delete pool objects
        // Update quote structures
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCarnival<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(init, payer=signer, space = std::mem::size_of::<CarnivalAccount>() + 8,
seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(
        init,
        payer = signer,
        space = 8,
        seeds = [b"carnival_auth", carnival.key().as_ref()],
        bump
    )]
    pub carnival_auth: AccountInfo<'info>,

    /// CHECK: escrow only purpose is to store sol
    #[account(
        init,
        payer = signer,
        space = 8,
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(
        mut,
        seeds = [b"carnival_auth", carnival.key().as_ref()],
        bump
    )]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        init,
        payer = signer,
        space = std::mem::size_of::<CarnivalAccount>() + 8,
        seeds = [b"carnival", carnival.key().as_ref(), &[pool_id]],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u8, carnival_auth_bump: u8)]
pub struct DepositSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump=carnival_auth_bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"carnival", carnival.key().as_ref(), &[pool_id]],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: escrow only purpose is to store sol
    #[account(
        mut,
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pool_id: u8, carnival_auth_bump: u8)]
pub struct DepositNft<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump=carnival_auth_bump)]
    pub carnival_auth: AccountInfo<'info>,

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
pub struct WithdrawSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawNfts<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct EvictSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct EvictNfts<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}
