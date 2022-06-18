use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solana_program;
use solana_program::{
    // clock::Clock,
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::invoke,
    program::invoke_signed,
    program_option::COption,
    system_instruction,
};

pub mod state;

use crate::state::metaplex_anchor::MplTokenMetadata;
use crate::state::{
    metaplex_adapter::{MetadataArgs, TokenProgramVersion},
    metaplex_anchor::TokenMetadata,
};

declare_id!("5bT8jS7JqHwpA6m5aC1PtJgpHGoZ9R9MxyZptkoPDJp8");

#[program]
pub mod nftamm {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<Initialize_Pool>,
        col_creator: Pubkey,
        col_symbol: String,
    ) -> Result<()> {
        let collection_pool = &mut ctx.accounts.collection_pool;
        collection_pool.col_creator = col_creator;
        collection_pool.col_symbol = col_symbol;

        msg!("msg in initialize here: {}", 2);
        println!("print init here");
        // setup a general collection pool account
        // needs to be able to access vaults

        // create token mint
        // initialize a swap
        //
        Ok(())
    }

    pub fn vault_insert(
        ctx: Context<Vault_Insert>,
        col_creator: Pubkey,
        col_symbol: String,
        collection_bump: u8,
    ) -> Result<()> {
        let collection_pool = &mut ctx.accounts.collection_pool;
        // let nft_vault = &mut ctx.accounts.nft_vault;
        let redeem_mint = &mut ctx.accounts.redeem_mint;

        let user = &mut ctx.accounts.user;
        let user_redeem_wallet = &mut ctx.accounts.user_redeem_wallet;

        let nft_metadata = &mut ctx.accounts.nft_metadata;
        let nft_user_token = &mut ctx.accounts.nft_user_token;

        msg!("msg here: {}", 2);
        // msg!("user nft count {}", nft_user_token.amount);

        // msg!("metadata symbol: {:?}", nft_metadata.data.symbol);
        // msg!("col pool symbol: {:?}", collection_pool.col_symbol);

        // msg!(
        //     "metadata creator: {:?}",
        //     nft_metadata.data.creators.as_ref().unwrap()[0].address
        // );
        // msg!("col pool creator: {:?}", collection_pool.col_creator);

        // send user redeem tokens
        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: redeem_mint.to_account_info(),
                    to: user_redeem_wallet.to_account_info(),
                    authority: collection_pool.to_account_info(),
                },
                &[&[
                    b"collection_pool".as_ref(),
                    col_symbol.as_ref(),
                    col_creator.as_ref(),
                    &[collection_bump],
                ]],
            ),
            1,
        )?;
        // send nft to a pda
        // take in nft address?

        msg!("msg here: {}", 3);
        Ok(())
    }

    pub fn vault_withdraw(
        ctx: Context<Vault_Withdraw>,
        col_creator: Pubkey,
        col_symbol: String,
        collection_bump: u8,
    ) -> Result<()> {
        msg!("msg here: {}", 1);
        let collection_pool = &mut ctx.accounts.collection_pool;
        // let nft_vault = &mut ctx.accounts.nft_vault;
        let redeem_mint = &mut ctx.accounts.redeem_mint;

        let user = &mut ctx.accounts.user;
        let user_redeem_wallet = &mut ctx.accounts.user_redeem_wallet;

        // take in nft address to withdraw?
        // send out nft from pda to user account
        // decrement pool address counter or method of tracking stored count of nfts

        msg!("msg here: {}", 2);
        // burn user redeem tokens
        anchor_spl::token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                anchor_spl::token::Burn {
                    from: user_redeem_wallet.to_account_info().clone(),
                    mint: redeem_mint.to_account_info().clone(),
                    authority: user.to_account_info().clone(),
                },
                &[&[
                    b"collection_pool".as_ref(),
                    col_symbol.as_ref(),
                    col_creator.as_ref(),
                    &[collection_bump],
                ]],
            ),
            1,
        )?;

        msg!("msg here: {}", 3);
        Ok(())
    }
}

// col_creator: Pubkey,
// col_symbol: String

#[derive(Accounts)]
#[instruction(col_creator: Pubkey, col_symbol: String)]
pub struct Initialize_Pool<'info> {
    #[account(init, payer = creator, space = std::mem::size_of::<CollectionPool>(), seeds = [b"collection_pool".as_ref(), col_symbol.as_ref(), col_creator.as_ref()], bump)]
    pub collection_pool: Account<'info, CollectionPool>,

    #[account(init, payer = creator, seeds = [b"redeem_mint".as_ref(), collection_pool.key().as_ref()], bump, mint::decimals = 1, mint::authority = collection_pool, mint::freeze_authority = collection_pool) ]
    pub redeem_mint: Account<'info, Mint>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(col_creator: Pubkey, col_symbol: String, collection_bump: u8)]
pub struct Vault_Insert<'info> {
    #[account(mut, constraint = redeem_mint.mint_authority == COption::Some(collection_pool.key()))]
    pub redeem_mint: Account<'info, Mint>,
    #[account(init_if_needed, payer = user, associated_token::mint = redeem_mint, associated_token::authority = user)]
    pub user_redeem_wallet: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,
    #[account(mut)]
    pub nft_user_token: Account<'info, TokenAccount>,
    #[account(mut, constraint = nft_metadata.data.symbol.trim_matches(char::from(0)) == collection_pool.col_symbol, constraint = nft_metadata.data.creators.as_ref().unwrap()[0].address == collection_pool.col_creator)]
    pub collection_pool: Box<Account<'info, CollectionPool>>,

    // // TODO make vault seeds better
    // #[account(init, payer = user, space = std::mem::size_of::<VaultAccount>(), seeds = [b"vault".as_ref(), collection_pool.key().as_ref()], bump)]
    // pub nft_vault: Account<'info, VaultAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/*
need to pass in
single nft mint account, and its metadata account, and the user's associated token account

in rust
need to check if mint and metadata accounts are linked
need to check if the collection pool data matches the metadata

need to transfer token from user's associated token account to pool's pda

*/

#[derive(Accounts)]
#[instruction(col_creator: Pubkey, col_symbol: String, collection_bump: u8)]
pub struct Vault_Withdraw<'info> {
    #[account(mut)]
    pub collection_pool: Account<'info, CollectionPool>,

    // // TODO make vault seeds better
    // #[account(init, payer = user, space = std::mem::size_of::<VaultAccount>(), seeds = [b"vault".as_ref(), collection_pool.key().as_ref()], bump)]
    // pub nft_vault: Account<'info, VaultAccount>,
    #[account(mut, constraint = redeem_mint.mint_authority == COption::Some(collection_pool.key()))]
    pub redeem_mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(init_if_needed, payer = user, associated_token::mint = redeem_mint, associated_token::authority = user)]
    pub user_redeem_wallet: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
#[derive(Default)]
pub struct CollectionPool {
    pub col_creator: Pubkey,
    pub col_symbol: String,
}

#[account]
#[derive(Default)]
pub struct VaultAccount {}

// todo find conversion ration between
