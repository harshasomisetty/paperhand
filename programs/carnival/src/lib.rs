use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use exhibition::state::metaplex_anchor::TokenMetadata;
use solana_program;
use solana_program::{
    account_info::AccountInfo, program::invoke, program::invoke_signed, system_instruction,
};

use exhibition::program::Exhibition;

use exhibition::{self, Exhibit};
// mod accounts;
// use accounts::{CarnivalAccount, Market};

pub mod state;
use state::curve::CurveType;

// pub mod utils;

declare_id!("4mSuHN8AW1z7Y4NFpS4jDc6DvNxur6qH8mbPMz5oHLiS");

#[program]
pub mod carnival {

    use super::*;

    pub fn initialize_carnival(ctx: Context<InitializeCarnival>) -> Result<()> {
        let cpi_program = ctx.accounts.exhibition_program.to_account_info();
        let cpi_accounts = exhibition::cpi::accounts::InitializeExhibit {
            exhibit: ctx.accounts.exhibit.to_account_info(),
            voucher_mint: ctx.accounts.voucher_mint.to_account_info(),
            nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
            signer: ctx.accounts.signer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        exhibition::cpi::initialize_exhibit(cpi_ctx);

        Ok(())
    }

    pub fn create_market(
        ctx: Context<InitializeMarket>,
        market_owner: Pubkey,
        market_id: u64,
        curve: u8,
        delta: u8,
        fee: u8,
    ) -> Result<()> {
        let mut market = &mut ctx.accounts.market;

        assert_eq!(market_id, ctx.accounts.carnival.market_id_count);

        market.market_id = ctx.accounts.carnival.market_id_count;
        market.market_owner = market_owner;
        market.curve = match curve {
            0 => CurveType::Linear,
            _ => CurveType::Exponential,
        };

        market.delta = delta;
        market.fee = fee;

        ctx.accounts.carnival.market_id_count = ctx.accounts.carnival.market_id_count + 1;
        Ok(())
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        market_id: u64,
        sol_amt: u64,
        carnival_auth_bump: u8,
        market_bump: u8,
    ) -> Result<()> {
        msg!("in dpepo sol");
        invoke(
            &system_instruction::transfer(
                ctx.accounts.signer.to_account_info().key,
                ctx.accounts.escrow_sol.to_account_info().key,
                sol_amt,
            ),
            &[
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.escrow_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        );
        msg!("finished depo sol");

        Ok(())
    }

    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        market_id: u64,
        carnival_auth_bump: u8,
        market_bump: u8,
    ) -> Result<()> {
        // TODO change signer so that there is another flag saying who is the delegate from signer field

        msg!("in depo nft");
        let cpi_program = ctx.accounts.exhibition_program.to_account_info();
        let cpi_accounts = exhibition::cpi::accounts::ArtifactInsert {
            exhibit: ctx.accounts.exhibit.to_account_info(),
            voucher_mint: ctx.accounts.voucher_mint.to_account_info(),
            user_voucher_wallet: ctx.accounts.user_voucher_wallet.to_account_info(),
            nft_mint: ctx.accounts.nft_mint.to_account_info(),
            nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
            nft_user_token: ctx.accounts.nft_user_token.to_account_info(),
            nft_artifact: ctx.accounts.nft_artifact.to_account_info(),
            // delegate_signer: ctx.accounts.market.to_account_info(),
            delegate_signer: ctx.accounts.signer.to_account_info(),
            signer: ctx.accounts.signer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
        };

        // let borrowed_bump = &[market_bump];
        // let borrowed_id = market_id.clone().to_le_bytes().to_owned();

        // let seeds = [
        //     b"market",
        //     ctx.accounts.carnival.to_account_info().key().as_ref(),
        //     &[market_bump],
        // ];

        // let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &[&seeds]);

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        exhibition::cpi::artifact_insert(cpi_ctx)?;
        msg!("did cpi");

        msg!("finished depo nft");

        Ok(())
    }

    pub fn trade_sol(ctx: Context<TradeSol>) -> Result<()> {
        // If specific, find markets nft belongs to
        // If any, loop through markets to find cheapest price

        // invoke(
        //     &system_instruction::transfer(
        //         ctx.accounts.signer.to_account_info().key,
        //         ctx.accounts.escrow_sol.to_account_info().key,
        //         sol_amt,
        //     ),
        //     &[
        //         ctx.accounts.signer.to_account_info(),
        //         ctx.accounts.escrow_sol.to_account_info(),
        //         ctx.accounts.system_program.to_account_info(),
        //     ],
        // );

        // transfer nft from carnival to user (or to escrow dll structure?)

        // anchor_spl::token::transfer(
        //     CpiContext::new_with_signer(
        //         ctx.accounts.token_program.to_account_info(),
        //         anchor_spl::token::Transfer {
        //             from: ctx.accounts.escrow_voucher.to_account_info(),
        //             to: ctx.accounts.order_voucher.to_account_info(),
        //             authority: ctx.accounts.checkout_auth.to_account_info(),
        //         },
        //         &[&[
        //             b"checkout_auth",
        //             ctx.accounts.exhibit.to_account_info().key.as_ref(),
        //             &[checkout_auth_bump],
        //         ]],
        //     ),
        //     1,
        // )?;

        // recalculate bids and asks

        // TODO robust swaps so that trade only happens if enough sol?
        Ok(())
    }

    pub fn trade_nft(ctx: Context<TradeNft>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        market_id: u64,
        sol_amt: u64,
        carnival_auth_bump: u8,
        escrow_auth_bump: u8,
    ) -> Result<()> {
        msg!("in withdraw sol");

        // TODO check to make sure right person is withdrawing

        // TODO sign for being able to move sol from escrow to user
        // TODO check to make sure user is correct

        invoke_signed(
            &system_instruction::transfer(
                ctx.accounts.escrow_sol.to_account_info().key,
                ctx.accounts.signer.to_account_info().key,
                sol_amt,
            ),
            &[
                ctx.accounts.escrow_sol.to_account_info(),
                ctx.accounts.signer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[
                b"escrow_sol".as_ref(),
                ctx.accounts.carnival.to_account_info().key.as_ref(),
                &[escrow_auth_bump],
            ]],
        )?;

        Ok(())
    }

    pub fn withdraw_nft(
        ctx: Context<WithdrawNft>,
        market_id: u64,
        carnival_auth_bump: u8,
        market_bump: u8,
    ) -> Result<()> {
        // check signer is market
        // check the user signer is the owner on the carnival
        // exhibit withdraw nft to user

        msg!("in withdraw nft");
        let cpi_program = ctx.accounts.exhibition_program.to_account_info();
        let cpi_accounts = exhibition::cpi::accounts::ArtifactWithdraw {
            exhibit: ctx.accounts.exhibit.to_account_info(),
            voucher_mint: ctx.accounts.voucher_mint.to_account_info(),
            user_voucher_wallet: ctx.accounts.user_voucher_wallet.to_account_info(),
            nft_mint: ctx.accounts.nft_mint.to_account_info(),
            nft_metadata: ctx.accounts.nft_metadata.to_account_info(),
            nft_user_token: ctx.accounts.nft_user_token.to_account_info(),
            nft_artifact: ctx.accounts.nft_artifact.to_account_info(),
            // delegate_signer: ctx.accounts.market.to_account_info(),
            delegate_signer: ctx.accounts.signer.to_account_info(),
            signer: ctx.accounts.signer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };

        // let borrowed_bump = &[market_bump];
        // let borrowed_id = market_id.clone().to_le_bytes().to_owned();

        // let seeds = [
        //     b"market",
        //     ctx.accounts.carnival.to_account_info().key().as_ref(),
        //     &[market_bump],
        // ];

        // let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, &[&seeds]);

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        exhibition::cpi::artifact_withdraw(cpi_ctx)?;
        msg!("did cpi");

        msg!("finished withdraw nft");

        Ok(())
    }

    pub fn close_market(
        ctx: Context<InitializeMarket>,
        market_owner: Pubkey,
        market_id: u64,
        curve: u8,
        delta: u8,
        fee: u8,
    ) -> Result<()> {
        msg!("in close market");

        // // 3) close pda nft artifact
        // anchor_spl::token::close_account(CpiContext::new_with_signer(
        //     ctx.accounts.token_program.to_account_info().clone(),
        //     anchor_spl::token::CloseAccount {
        //         account: ctx.accounts.nft_artifact.to_account_info(),
        //         destination: ctx.accounts.exhibit.to_account_info(),
        //         authority: ctx.accounts.exhibit.to_account_info(),
        //     },
        //     &[&seeds],
        // ))?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCarnival<'info> {
    /// CHECK: escrow only purpose is to store sol
    #[account(mut)]
    pub exhibit: AccountInfo<'info>,
    // pub exhibit: Account<'info, Exhibit>,
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
    #[account(mut)]
    pub voucher_mint: AccountInfo<'info>,

    /// CHECK: escrow only purpose is to store sol
    #[account(mut)]
    pub nft_metadata: AccountInfo<'info>,

    /// CHECK: escrow only purpose is to store sol
    #[account(
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        owner = system_program.key(),
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub exhibition_program: Program<'info, Exhibition>,
}

#[derive(Accounts)]
#[instruction(market_owner: Pubkey, market_id: u64, curve: u8, delta: u8, fee: u8)]
pub struct InitializeMarket<'info> {
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
        space = std::mem::size_of::<Market>() + 8,
        seeds = [b"market", carnival.key().as_ref(), market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64, sol_amt: u64, carnival_auth_bump: u8, market_bump: u8)]
pub struct DepositSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"market", carnival.key().as_ref(), market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

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
#[instruction(market_id: u64, carnival_auth_bump: u8, market_bump: u8)]
pub struct DepositNft<'info> {
    #[account(mut)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Box<Account<'info, CarnivalAccount>>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump=carnival_auth_bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"market", carnival.key().as_ref(), market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
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

    /// CHECK: cpi stuff
    #[account(mut)]
    pub nft_artifact: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub exhibition_program: Program<'info, Exhibition>,
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
#[instruction(market_id: u64, sol_amt: u64, carnival_auth_bump: u8, escrow_auth_bump: u8)]
pub struct WithdrawSol<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Account<'info, CarnivalAccount>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"market", carnival.key().as_ref(), market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

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
#[instruction(market_id: u64, carnival_auth_bump: u8, market_bump: u8)]
pub struct WithdrawNft<'info> {
    #[account(mut)]
    pub exhibit: Box<Account<'info, Exhibit>>,

    #[account(mut, seeds = [b"carnival", exhibit.key().as_ref()], bump)]
    pub carnival: Box<Account<'info, CarnivalAccount>>,

    /// CHECK: auth only needs to sign for stuff, no metadata
    #[account(mut, seeds = [b"carnival_auth", carnival.key().as_ref()], bump)]
    pub carnival_auth: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"market", carnival.key().as_ref(), market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
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

    /// CHECK: cpi stuff
    #[account(mut)]
    pub nft_artifact: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub exhibition_program: Program<'info, Exhibition>,
}

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}
#[constant]
pub const MAX_ARRAY_SIZE: u64 = 32;

#[account]
#[derive(Default)]
#[repr(C)]
pub struct Market {
    pub market_id: u64,
    pub market_owner: Pubkey,
    pub sol: u64,
    pub nfts: u64,
    pub curve: CurveType,
    pub delta: u8,
    pub fee: u8,
}

#[derive(Default, AnchorDeserialize, AnchorSerialize, Clone, Copy, Debug)]
pub struct Quote {
    market_id: u64,
    bid: u64,
    ask: u64,
}

#[account]
#[derive(Default)]
#[repr(C)]
pub struct CarnivalAccount {
    pub market_id_count: u64,
}
