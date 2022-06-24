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

declare_id!("6Duew5DzYuBMvRPXTXRML2wvp2EvdPKgBofKhUwxHGQi");

#[program]
pub mod bazaar {
    use anchor_lang::system_program::Transfer;

    use super::*;

    pub fn initialize_exhibit(
        ctx: Context<InitializeExhibit>,
        exhibit_creator: Pubkey,
        exhibit_symbol: String,
    ) -> Result<()> {
        let exhibit = &mut ctx.accounts.exhibit;
        exhibit.exhibit_creator = exhibit_creator;
        exhibit.exhibit_symbol = exhibit_symbol;
        exhibit.nft_count = 0;
        exhibit.market_active = false;
        Ok(())
    }

    pub fn initalize_market(
        ctx: Context<InitializeMarket>,
        starting_token_a: u64,
        starting_token_b: u64,
        exhibit_bump: u8,
    ) -> Result<()> {
        require!(
            ctx.accounts.creator.to_account_info().key == ctx.accounts.exhibit.exhibit_creator,
            ExhibitAndMarketCreatorDiffer
        );

        require!(
            ctx.accounts.creator_token_a.amount > starting_token_a,
            LackOfFunds
        );
        require!(
            ctx.accounts.creator_token_b.amount > starting_token_b,
            LackOfFunds
        );

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.creator_token_a.to_account_info(),
                    to: ctx.accounts.market_token_a.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info,
                },
            ),
            starting_token_a,
        );

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.creator_token_b.to_account_info(),
                    to: ctx.accounts.market_token_b.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info,
                },
            ),
            starting_token_b,
        );

        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.creator_token_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[exhibit_bump],
                ]],
            ),
            starting_token_a,
        )?;

        ctx.accounts.exhibit.market_active = true;

        Ok(())
    }

    pub fn swap(ctx: Context<Swap>) -> Result<()> {
        Ok(())
    }

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>) -> Result<()> {
        /* liquidity can be deposited at the beginning of pool (when no prev liq exists), or during regular trading
         * when depositing at beginning, the proper calculate for amount of sol is hard, since the creator of pool must do the initial setting
         * so, see if pool has started yet or not
         * if started, then make sure the person interacting with the pool is the creator. if so, then allow person to deposit how much ever sol they want
         *
         * now, if the pool is started,
         *
         * Or normally when pool is active
         */
        require!(ctx.accounts.exhibit.market_active == true, MarketNotActive);

        // token::transfer(
        //     ctx.accounts
        //         .into_transfer_to_token_a_context()
        //         .with_signer(&[&seeds[..]]),
        //     token_a_amount,
        // )?;

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.creator_token_a.to_account_info(),
                    to: ctx.accounts.market_token_a.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info,
                },
            ),
            starting_token_a,
        );

        // token::transfer(
        //     ctx.accounts
        //         .into_transfer_to_token_b_context()
        //         .with_signer(&[&seeds[..]]),
        //     token_b_amount,
        // )?;

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.creator_token_b.to_account_info(),
                    to: ctx.accounts.market_token_b.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info,
                },
            ),
            starting_token_b,
        );

        // token::mint_to(
        //     ctx.accounts
        //         .into_mint_to_context()
        //         .with_signer(&[&seeds[..]]),
        //     u64::try_from(pool_token_amount).unwrap(),
        // )?;

        anchor_spl::token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::MintTo {
                    mint: ctx.accounts.market_mint.to_account_info(),
                    to: ctx.accounts.creator_token_liq.to_account_info(),
                    authority: ctx.accounts.market_auth.to_account_info(),
                },
                &[&[
                    b"market_auth".as_ref(),
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[exhibit_bump],
                ]],
            ),
            starting_token_a,
        )?;

        Ok(())
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>) -> Result<()> {
        Ok(())
    }
}

// temp method to use in single Bazaar contract, copied from exhibition contract
#[derive(Accounts)]
#[instruction(exhibit_creator: Pubkey, exhibit_symbol: String)]
pub struct InitializeExhibit<'info> {
    #[account(init, payer = creator, space = std::mem::size_of::<Exhibit>(), seeds = [b"exhibit".as_ref(), exhibit_symbol.as_ref(), exhibit_creator.as_ref()], bump)]
    pub exhibit: Account<'info, Exhibit>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(exhibit_creator: Pubkey, exhibit_symbol: String, exhibit_BUMP: u8)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub exhibit: Account<'info, Exhibit>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(init, payer = creator, space = 8, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(init, payer = creator, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Account<'info, Mint>,

    #[account(init, payer = creator, associated_token::mint = market_mint, associated_token::authority = market_auth)]
    pub market_token_fee: Account<'info, TokenAccount>,

    // no idea
    // pub market_token_destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,

    #[account(init, payer = creator, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Account<'info, TokenAccount>,
    #[account(init, payer = creator, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub creator_token_a: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub creator_token_b: Account<'info, TokenAccount>,

    #[account(init, payer = creator, associated_token::mint = market_mint, associated_token::authority = creator)]
    pub creator_token_liq: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    /* market auth?
     * user source
     * swap source
     * user destination
     * swap destination
     * */
}

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(mut)]
    pub exhibit: Account<'info, Exhibit>,

    /// CHECK: Need market auth since can't pass in market state as a signer
    #[account(mut, seeds = [b"market_auth", exhibit.key().as_ref()], bump)]
    pub market_auth: AccountInfo<'info>,

    #[account(mut, seeds = [b"market_token_mint".as_ref(), market_auth.key().as_ref()], bump, mint::decimals = 9, mint::authority = market_auth, mint::freeze_authority = market_auth)]
    pub market_mint: Account<'info, Mint>,

    // no idea
    // pub market_token_destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub token_a_mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_b_mint: Account<'info, Mint>,

    #[account(mut, seeds = [b"token_a".as_ref(), market_auth.key().as_ref()], token::mint = token_a_mint, token::authority = market_auth, bump)]
    pub market_token_a: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"token_b".as_ref(), market_auth.key().as_ref()], token::mint = token_b_mint, token::authority = market_auth, bump)]
    pub market_token_b: Account<'info, TokenAccount>,

    #[account(mut, associated_token::mint = token_a_mint, associated_token::authority = depositor)]
    pub user_token_a: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = token_b_mint, associated_token::authority = depositor)]
    pub user_token_b: Account<'info, TokenAccount>,

    #[account(mut, associated_token::mint = market_mint, associated_token::authority = depositor)]
    pub user_token_liq: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {}

#[account]
#[derive(Default)]
pub struct Exhibit {
    pub exhibit_creator: Pubkey,
    pub exhibit_symbol: String,
    pub nft_count: u32,
    pub market_active: bool,
}

#[error_code]
pub enum MyError {
    #[msg("Exhibit creator is not the same as market initializer")]
    ExhibitAndMarketCreatorDiffer,

    #[msg("Account does not have enough funds")]
    LackOfFunds,

    #[msg("Market not active")]
    MarketNotActive,
}
