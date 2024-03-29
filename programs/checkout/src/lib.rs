use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke, system_instruction};

pub mod state;
use state::checkout_queue::CheckoutQueue;
use state::orderbook::Orderbook;

declare_id!("8b7yjj2P5fHV9NCyNXJut1pDM1J1D9oRKzqUGW1ycTWk");

#[program]
pub mod checkout {

    use solana_program::native_token::LAMPORTS_PER_SOL;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.matched_storage.matched_orders = ctx.accounts.matched_orders.key();

        let mut matched_orders = ctx.accounts.matched_orders.load_init()?;

        matched_orders.trades = CheckoutQueue::initialize();

        // msg!("linked holder data {:?}", &matched_orders.trades.order_head);
        Ok(())
    }

    pub fn make_bid(ctx: Context<MakeBid>, bid_price: u64) -> Result<()> {
        msg!("in make bid");
        msg!("bid price: {}", bid_price / LAMPORTS_PER_SOL);

        let bid_price_sol = bid_price;

        invoke(
            &system_instruction::transfer(
                ctx.accounts.bidder.to_account_info().key,
                ctx.accounts.escrow_sol.to_account_info().key,
                bid_price_sol,
            ),
            &[
                ctx.accounts.bidder.to_account_info(),
                ctx.accounts.escrow_sol.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        );

        let bid_orders = &mut ctx.accounts.bid_orders.load_mut()?;

        bid_orders
            .orderbook
            .add(bid_price, ctx.accounts.bidder.to_account_info().key());

        let highest_bid = bid_orders.orderbook.peek_highest_bid();

        msg!("current highest BID : {}", highest_bid.bid_price);

        Ok(())
    }

    pub fn cancel_bid(ctx: Context<CancelBid>, order_id: u64) -> Result<()> {
        let bidder = &ctx.accounts.bidder;

        let mut bid_orders = ctx.accounts.bid_orders.load_mut()?;

        let bid_price_sol = bid_orders.orderbook.cancel_bid(bidder.key(), order_id);

        **ctx
            .accounts
            .escrow_sol
            .to_account_info()
            .try_borrow_mut_lamports()? -= bid_price_sol;
        **ctx.accounts.bidder.try_borrow_mut_lamports()? += bid_price_sol;

        Ok(())
    }

    pub fn sell_floor(ctx: Context<SellFloor>) -> Result<()> {
        msg!("in set_data pubkey");

        let mut bid_orders = ctx.accounts.bid_orders.load_mut()?;

        let highest_bid = bid_orders.orderbook.pop_highest_bid();

        let mut matched_orders = ctx.accounts.matched_orders.load_mut()?;

        matched_orders.trades.insert_node(highest_bid.bidder_pubkey);

        msg!(
            "linked holder data {:?}, {:?}",
            matched_orders.trades.free_head,
            matched_orders.trades.order_head
        );

        msg!(
            "voucher balance user: {}, escorw: {}",
            ctx.accounts.user_voucher.amount,
            ctx.accounts.escrow_voucher.amount
        );

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_voucher.to_account_info(),
                    to: ctx.accounts.escrow_voucher.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            1,
        )?;

        **ctx
            .accounts
            .escrow_sol
            .to_account_info()
            .try_borrow_mut_lamports()? -= &highest_bid.bid_price;
        **ctx.accounts.user.try_borrow_mut_lamports()? += &highest_bid.bid_price;

        Ok(())
    }

    pub fn fulfill_order(
        ctx: Context<FulfillOrder>,
        pubkey_to_remove: Pubkey,
        checkout_auth_bump: u8,
    ) -> Result<()> {
        msg!("in remove_order pubkey: {}", &pubkey_to_remove.to_string());

        let mut matched_orders = ctx.accounts.matched_orders.load_mut()?;

        matched_orders
            .trades
            .remove_node_by_pubkey(pubkey_to_remove);

        msg!("escrow bal: {}", ctx.accounts.escrow_voucher.amount);

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.escrow_voucher.to_account_info(),
                    to: ctx.accounts.order_voucher.to_account_info(),
                    authority: ctx.accounts.checkout_auth.to_account_info(),
                },
                &[&[
                    b"checkout_auth",
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[checkout_auth_bump],
                ]],
            ),
            1,
        )?;

        Ok(())
    }
}

// TODO MAKE SURE STORED ACCOUNT PUBKEY CONSTRAINT WORKS
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(zero)]
    pub matched_orders: AccountLoader<'info, MatchedOrders>,

    #[account(init,
        payer = user,
        space = std::mem::size_of::<MatchedStorage>() + 8,
        seeds = [b"matched_orders", exhibit.key().as_ref()], bump
    )]
    pub matched_storage: Account<'info, MatchedStorage>,

    #[account(init,
        payer = user,
        space = std::mem::size_of::<BidOrders>() + 8,
        seeds = [b"bid_orders", exhibit.key().as_ref()], bump
    )]
    pub bid_orders: AccountLoader<'info, BidOrders>,

    #[account(init, payer = user, space = 8+std::mem::size_of::<CheckoutAuth>(), seeds=[b"checkout_auth", exhibit.key().as_ref()], bump)]
    pub checkout_auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        seeds = [b"escrow_voucher", checkout_auth.key().as_ref()],
        token::mint = voucher_mint,
        token::authority = checkout_auth,
        bump
    )]
    pub escrow_voucher: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        space = std::mem::size_of::<SolWallet>() + 8,
        seeds = [b"escrow_sol", exhibit.key().as_ref()],
        bump
    )]
    pub escrow_sol: Account<'info, SolWallet>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct MakeBid<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut,
        seeds = [b"bid_orders", exhibit.key().as_ref()], bump
    )]
    pub bid_orders: AccountLoader<'info, BidOrders>,

    #[account(mut, seeds = [b"escrow_sol", exhibit.key().as_ref()], bump)]
    pub escrow_sol: Account<'info, SolWallet>,

    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CancelBid<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut,
        seeds = [b"bid_orders", exhibit.key().as_ref()], bump
    )]
    pub bid_orders: AccountLoader<'info, BidOrders>,

    #[account(mut, seeds = [b"escrow_sol", exhibit.key().as_ref()], bump)]
    pub escrow_sol: Account<'info, SolWallet>,

    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellFloor<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut)]
    pub matched_orders: AccountLoader<'info, MatchedOrders>,

    #[account(mut,
        has_one = matched_orders,
        seeds = [b"matched_orders", exhibit.key().as_ref()], bump
    )]
    pub matched_storage: Account<'info, MatchedStorage>,

    #[account(mut,
        seeds = [b"bid_orders", exhibit.key().as_ref()], bump
    )]
    pub bid_orders: AccountLoader<'info, BidOrders>,

    #[account(mut, seeds=[b"checkout_auth", exhibit.key().as_ref()], bump)]
    pub checkout_auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = voucher_mint,
        token::authority = checkout_auth,
    )]
    pub escrow_voucher: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"escrow_sol", exhibit.key().as_ref()], bump)]
    pub escrow_sol: Account<'info, SolWallet>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = user
    )]
    pub user_voucher: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pubkey_to_remove: Pubkey, checkout_auth_bump: u8)]
pub struct FulfillOrder<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut)]
    pub matched_orders: AccountLoader<'info, MatchedOrders>,

    #[account(mut,
        has_one = matched_orders,
        seeds = [b"matched_orders", exhibit.key().as_ref()], bump
    )]
    pub matched_storage: Account<'info, MatchedStorage>,

    #[account(mut, seeds=[b"checkout_auth", exhibit.key().as_ref()], bump)]
    pub checkout_auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = voucher_mint,
        token::authority = checkout_auth,
    )]
    pub escrow_voucher: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = order_user
    )]
    pub order_voucher: Account<'info, TokenAccount>,

    /// CHECK: just reading pubkey
    pub order_user: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// TODO consider case when ATA owner is not the pubkey, if you don't check owner its "fine" but wrong person gets the voucher, but if the ownership doens't match, just make a new token account.

// conrract side check token acocunt owner

#[account(zero_copy)]
#[repr(C)]
pub struct MatchedOrders {
    pub trades: CheckoutQueue,
}

#[account]
#[derive(Default)]
pub struct CheckoutAuth {}

#[account]
#[derive(Default)]
pub struct MatchedStorage {
    pub matched_orders: Pubkey,
}

#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct BidOrders {
    pub authority: Pubkey,    // 32
    pub orderbook: Orderbook, // 1,544 bytes
    pub bump: u8,             // stores the bump for the PDA
}

#[account]
#[derive(Default)]
pub struct SolWallet {}
