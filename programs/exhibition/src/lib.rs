use crate::state::metaplex_anchor::TokenMetadata;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use solana_program;
use solana_program::{account_info::AccountInfo, program_option::COption};
pub mod state;
pub mod utils;
use crate::utils::{
    creator_single_seed, exhibit_pubkey_gen, exhibit_pubkey_seeds, exhibit_pubkey_verify,
};

declare_id!("AqzBa4Xaiorxbu49AV6Ja9RsspZXSCWcJCZp3imeLLhg");

#[program]
pub mod exhibition {

    use super::*;

    pub fn initialize_exhibit(ctx: Context<InitializeExhibit>) -> Result<()> {
        ctx.accounts.exhibit.exhibit_symbol = ctx
            .accounts
            .nft_metadata
            .data
            .symbol
            .trim_matches(char::from(0))
            .to_string();

        ctx.accounts.exhibit.artifact_count = 0;
        // TODO add verified creator
        ctx.accounts.exhibit.creator =
            ctx.accounts.nft_metadata.data.creators.as_ref().unwrap()[0].address;

        msg!(
            "creator: {}",
            ctx.accounts.nft_metadata.data.creators.as_ref().unwrap()[0].address
        );
        Ok(())
    }

    pub fn artifact_insert(ctx: Context<ArtifactInsert>) -> Result<()> {
        require!(
            exhibit_pubkey_verify(
                ctx.accounts.exhibit.key(),
                ctx.accounts.nft_metadata.data.creators.as_ref().unwrap(),
                &ctx.accounts.exhibit.exhibit_symbol,
                id(),
            )
            .unwrap(),
            MyError::ExhibitConstraintViolated
        );

        let (_pubkey, bump_seed) = exhibit_pubkey_gen(
            ctx.accounts.nft_metadata.data.creators.as_ref().unwrap(),
            &ctx.accounts.exhibit.exhibit_symbol,
            id(),
        );

        let borrowed_bump = &[bump_seed];
        let seeds = exhibit_pubkey_seeds(
            ctx.accounts.nft_metadata.data.creators.as_ref().unwrap(),
            &ctx.accounts.exhibit.exhibit_symbol,
            borrowed_bump,
        );

        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.voucher_mint.to_account_info(),
                    to: ctx.accounts.user_voucher_wallet.to_account_info(),
                    authority: ctx.accounts.exhibit.to_account_info(),
                },
                &[&seeds],
            ),
            1,
        )?;

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
                    authority: ctx.accounts.exhibit.to_account_info(),
                },
                &[&seeds],
            ),
            0,
        )?;
        ctx.accounts.exhibit.artifact_count = ctx.accounts.exhibit.artifact_count + 1;
        Ok(())
    }

    pub fn artifact_withdraw(ctx: Context<ArtifactWithdraw>) -> Result<()> {
        msg!("msg here: {}", 1);

        require!(
            exhibit_pubkey_verify(
                ctx.accounts.exhibit.key(),
                ctx.accounts.nft_metadata.data.creators.as_ref().unwrap(),
                &ctx.accounts.exhibit.exhibit_symbol,
                id(),
            )
            .unwrap(),
            MyError::ExhibitConstraintViolated
        );
        // 1) transfer nft from pda to user nft account

        let (_pubkey, bump_seed) = exhibit_pubkey_gen(
            ctx.accounts.nft_metadata.data.creators.as_ref().unwrap(),
            &ctx.accounts.exhibit.exhibit_symbol,
            id(),
        );

        let borrowed_bump = &[bump_seed];
        let seeds = exhibit_pubkey_seeds(
            ctx.accounts.nft_metadata.data.creators.as_ref().unwrap(),
            &ctx.accounts.exhibit.exhibit_symbol,
            borrowed_bump,
        );
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.nft_artifact.to_account_info(),
                    to: ctx.accounts.nft_user_token.to_account_info(),
                    authority: ctx.accounts.exhibit.to_account_info(),
                },
                &[&seeds],
            ),
            1,
        )?;

        msg!(
            "voucher wallet bal {}",
            ctx.accounts.user_voucher_wallet.amount
        );
        // 2) burn voucher token from user
        anchor_spl::token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info().clone(),
                anchor_spl::token::Burn {
                    from: ctx.accounts.user_voucher_wallet.to_account_info(),
                    mint: ctx.accounts.voucher_mint.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
                &[&seeds],
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
            &[&seeds],
        ))?;

        ctx.accounts.exhibit.artifact_count = ctx.accounts.exhibit.artifact_count - 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeExhibit<'info> {
    #[account(
        init,
        payer = signer,
        space = std::mem::size_of::<Exhibit>(),
        seeds = [
            creator_single_seed(nft_metadata.data.creators.as_ref().unwrap(), 0),
            creator_single_seed(nft_metadata.data.creators.as_ref().unwrap(), 1),
            creator_single_seed(nft_metadata.data.creators.as_ref().unwrap(), 2),
            creator_single_seed(nft_metadata.data.creators.as_ref().unwrap(), 3),
            creator_single_seed(nft_metadata.data.creators.as_ref().unwrap(), 4),
            b"exhibit",
            nft_metadata.data.symbol.trim_matches(char::from(0)).as_ref(),
        ], bump)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(
        init,
        payer = signer,
        seeds = [b"voucher_mint".as_ref(), exhibit.key().as_ref()], bump,
        mint::decimals = 0,
        mint::authority = exhibit,
        mint::freeze_authority = exhibit
    )]
    pub voucher_mint: Account<'info, Mint>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ArtifactInsert<'info> {
    #[account(mut)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(
        mut,
        constraint = voucher_mint.mint_authority == COption::Some(exhibit.key())
    )]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = signer
    )]
    pub user_voucher_wallet: Account<'info, TokenAccount>,

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
        token::authority = exhibit,
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
pub struct ArtifactWithdraw<'info> {
    #[account(mut)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(
        mut,
        constraint = voucher_mint.mint_authority == COption::Some(exhibit.key())
    )]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = signer
    )]
    pub user_voucher_wallet: Account<'info, TokenAccount>,

    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub nft_metadata: Box<Account<'info, TokenMetadata>>,
    #[account(mut)]
    pub nft_user_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"nft_artifact".as_ref(), exhibit.key().as_ref(), nft_mint.key().as_ref()],
        token::mint = nft_mint,
        token::authority = exhibit,
        bump
    )]
    pub nft_artifact: Account<'info, TokenAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(Default)]
pub struct Exhibit {
    pub exhibit_symbol: String,
    pub creator: Pubkey,
    pub auth_bump: u8,
    pub artifact_count: u8,
}

#[error_code]
pub enum MyError {
    #[msg("User NFT account does not have the NFT")]
    UserLacksNFT,
    #[msg("Exhibit pubkey not the same as the verified creators on nft")]
    ExhibitConstraintViolated,
}
