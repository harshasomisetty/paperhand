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

pub mod state;

use crate::state::metaplex_anchor::MplTokenMetadata;
use crate::state::{
    metaplex_adapter::{MetadataArgs, TokenProgramVersion},
    metaplex_anchor::TokenMetadata,
};

declare_id!("HuDzzsYtxmz7mSXTQ2gheKdLM3UTkFhbCTVKuARhsHsZ");

#[program]
pub mod exhibition{
    use super::*;

    pub fn initialize_exhibit(
        ctx: Context<Initialize_Exhibit>,
        col_creator: Pubkey,
        col_symbol: String,
    ) -> Result<()> {
        let exhibit = &mut ctx.accounts.exhibit;
        exhibit.col_creator = col_creator;
        exhibit.col_symbol = col_symbol;
        exhibit.nft_count = 0;

        Ok(())
    }

    pub fn artifact_insert(
        ctx: Context<Artifact_Insert>,
        col_creator: Pubkey,
        col_symbol: String,
        exhibit_bump: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.nft_user_token.amount > 0,
            MyError::UserLacksNFT
        );

        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.redeem_mint.to_account_info(),
                    to: ctx.accounts.user_redeem_wallet.to_account_info(),
                    authority: ctx.accounts.exhibit.to_account_info(),
                },
                &[&[
                    b"exhibit".as_ref(),
                    col_symbol.as_ref(),
                    col_creator.as_ref(),
                    &[exhibit_bump],
                ]],
            ),
            1,
        )?;

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.nft_user_token.to_account_info(),
                    to: ctx.accounts.nft_artifact.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            1,
        );

        ctx.accounts.exhibit.nft_count = ctx.accounts.exhibit.nft_count + 1;
        ctx.accounts.artifact_metadata.nft_metadata = ctx.accounts.nft_metadata.key();

        Ok(())
    }

    pub fn artifact_withdraw(
        ctx: Context<Artifact_Withdraw>,
        col_creator: Pubkey,
        col_symbol: String,
        exhibit_bump: u8,
    ) -> Result<()> {
        msg!("msg here: {}", 1);

        // 1) transfer nft from pda to user nft account

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.nft_artifact.to_account_info(),
                    to: ctx.accounts.nft_user_token.to_account_info(),
                    authority: ctx.accounts.exhibit.to_account_info(),
                },
                &[&[
                    b"exhibit".as_ref(),
                    col_symbol.as_ref(),
                    col_creator.as_ref(),
                    &[exhibit_bump],
                ]],
            ),
            1,
        );

        // 2) burn redeem token from user
        anchor_spl::token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                anchor_spl::token::Burn {
                    from: ctx.accounts.user_redeem_wallet.to_account_info(),
                    mint: ctx.accounts.redeem_mint.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
                &[&[
                    b"exhibit".as_ref(),
                    col_symbol.as_ref(),
                    col_creator.as_ref(),
                    &[exhibit_bump],
                ]],
            ),
            1,
        )?;

        // 3) close pda nft artifact
        anchor_spl::token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().clone(),
            anchor_spl::token::CloseAccount {
                account: ctx.accounts.nft_artifact.to_account_info(),
                destination: ctx.accounts.exhibit.to_account_info(),
                authority: ctx.accounts.exhibit.to_account_info(),
            },
            &[&[
                b"exhibit".as_ref(),
                col_symbol.as_ref(),
                col_creator.as_ref(),
                &[exhibit_bump],
            ]],
        ))?;

        ctx.accounts.exhibit.nft_count = ctx.accounts.exhibit.nft_count - 1;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(col_creator: Pubkey, col_symbol: String)]
pub struct Initialize_Exhibit<'info> {
    #[account(init, payer = creator, space = std::mem::size_of::<Exhibit>(), seeds = [b"exhibit".as_ref(), col_symbol.as_ref(), col_creator.as_ref()], bump)]
    pub exhibit: Account<'info, Exhibit>,

    #[account(init, payer = creator, seeds = [b"redeem_mint".as_ref(), exhibit.key().as_ref()], bump, mint::decimals = 1, mint::authority = exhibit, mint::freeze_authority = exhibit) ]
    pub redeem_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(col_creator: Pubkey, col_symbol: String, exhibit_bump: u8)]
pub struct Artifact_Insert<'info> {
    #[account(
        mut,
        constraint = redeem_mint.mint_authority == COption::Some(exhibit.key())
    )]
    pub redeem_mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = redeem_mint,
        associated_token::authority = user
    )]
    pub user_redeem_wallet: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,
    #[account(mut)]
    pub nft_user_token: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = nft_metadata.data.symbol.trim_matches(char::from(0)) == exhibit.col_symbol,
        constraint = nft_metadata.data.creators.as_ref().unwrap()[0].address == exhibit.col_creator
    )]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(
        init,
        payer = user,
        seeds = [b"nft_artifact".as_ref(), exhibit.key().as_ref(), nft_mint.key().as_ref()],
        token::mint = nft_mint,
        token::authority = exhibit,
        bump
    )]
    pub nft_artifact: Account<'info, TokenAccount>,

    #[account(
        init,
        space = std::mem::size_of::<ArtifactMetadata>() + 8,
        payer = user,
        seeds = [b"artifact_metadata".as_ref(), exhibit.key().as_ref(), nft_artifact.key().as_ref()],
        bump
    )]
    pub artifact_metadata: Account<'info, ArtifactMetadata>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(col_creator: Pubkey, col_symbol: String, exhibit_bump: u8)]
pub struct Artifact_Withdraw<'info> {
    #[account(
        mut,
        constraint = redeem_mint.mint_authority == COption::Some(exhibit.key())
    )]
    pub redeem_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = redeem_mint,
        associated_token::authority = user
    )]
    pub user_redeem_wallet: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,
    #[account(mut)]
    pub nft_user_token: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = nft_metadata.data.symbol.trim_matches(char::from(0)) == exhibit.col_symbol,
        constraint = nft_metadata.data.creators.as_ref().unwrap()[0].address == exhibit.col_creator
    )]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(
        mut,
        seeds = [b"nft_artifact".as_ref(), exhibit.key().as_ref(), nft_mint.key().as_ref()],
        token::mint = nft_mint,
        token::authority = exhibit,
        bump
    )]
    pub nft_artifact: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"artifact_metadata".as_ref(), exhibit.key().as_ref(), nft_artifact.key().as_ref()],
        close = exhibit,
        bump
    )]
    pub artifact_metadata: Account<'info, ArtifactMetadata>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
#[derive(Default)]
pub struct Exhibit {
    pub col_creator: Pubkey,
    pub col_symbol: String,
    pub nft_count: u32,
}

#[account]
#[derive(Default)]
pub struct ArtifactMetadata {
    pub nft_metadata: Pubkey,
}

#[error_code]
pub enum MyError {
    #[msg("User NFT account does not have the NFT")]
    UserLacksNFT,
}
