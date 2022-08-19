use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};
use exhibition::state::metaplex_anchor::TokenMetadata;
use solana_program;
use solana_program::{
    account_info::AccountInfo, program::invoke, program::invoke_signed, system_instruction,
};

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

        // TODO create escrow here

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

        Ok(())
    }

    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        market_id: u64,
        carnival_auth_bump: u8,
    ) -> Result<()> {
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

        // TODO cpi into exhibition

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

    pub fn withdraw_nfts(ctx: Context<WithdrawNfts>) -> Result<()> {
        // Withdraw sol to user
        // If both sides are empty of assets, delete market objects
        // Update quote structures
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
        seeds = [b"escrow_sol", carnival.key().as_ref()],
        owner = system_program.key(),
        bump
    )]
    pub escrow_sol: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
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
#[instruction(market_id: u64, sol_amt: u64, carnival_auth_bump: u8)]
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
#[instruction(market_id: u64, carnival_auth_bump: u8)]
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
pub struct WithdrawNfts<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
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
