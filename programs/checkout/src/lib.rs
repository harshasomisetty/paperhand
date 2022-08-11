use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke, system_instruction};

use exhibition::program::Exhibition;
use exhibition::{self, Exhibit};

pub mod state;
use state::heap::Heap;
use state::linked_list::LinkedList;

declare_id!("8b7yjj2P5fHV9NCyNXJut1pDM1J1D9oRKzqUGW1ycTWk");

#[program]
pub mod checkout {

    use solana_program::native_token::LAMPORTS_PER_SOL;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("In initializer");

        let list = LinkedList::initialize();

        ctx.accounts.matched_orders_address.matched_orders = ctx.accounts.matched_orders.key();

        let mut matched_orders = ctx.accounts.matched_orders.load_init()?;

        matched_orders.trades = list;

        msg!("linked holder data {:?}", &matched_orders.trades.order_head);
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
            .heap
            .add(bid_price, ctx.accounts.bidder.to_account_info().key());

        let highest_bid = bid_orders.heap.peek_highest_bid();

        msg!("current highest BID : {}", highest_bid.bid_price);

        Ok(())
    }

    pub fn cancel_bid(ctx: Context<CancelBid>) -> Result<()> {
        let bidder = &ctx.accounts.bidder;

        let mut heap = ctx.accounts.bid_orders.load_mut()?;

        // Need a clever way to somehow know the bid price after the let mut heap declaration
        let bid_price_sol = heap.heap.cancel_bid(bidder.key());

        **ctx
            .accounts
            .escrow_sol
            .to_account_info()
            .try_borrow_mut_lamports()? -= bid_price_sol;
        **ctx.accounts.bidder.try_borrow_mut_lamports()? += bid_price_sol;

        // msg!("canceling heap data: {}", heap.heap);

        Ok(())
    }

    pub fn bid_floor(ctx: Context<BidFloor>) -> Result<()> {
        msg!("in set_data pubkey");

        let mut heap = ctx.accounts.bid_orders.load_mut()?;

        let highest_bid = heap.heap.pop_highest_bid();

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
        auth_bump: u8,
    ) -> Result<()> {
        msg!("in remove_order pubkey: {}", &pubkey_to_remove.to_string());

        let mut matched_orders = ctx.accounts.matched_orders.load_mut()?;
        matched_orders
            .trades
            .remove_node_by_pubkey(pubkey_to_remove);

        msg!("escrow bal: {}", ctx.accounts.escrow_voucher.amount);
        // TODO get seeds of pda?
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.escrow_voucher.to_account_info(),
                    to: ctx.accounts.order_voucher.to_account_info(),
                    authority: ctx.accounts.auth.to_account_info(),
                },
                &[&[
                    b"auth",
                    ctx.accounts.exhibit.to_account_info().key.as_ref(),
                    &[auth_bump],
                ]],
            ),
            1,
        )?;

        Ok(())
    }
    // TODO which node indexes (10, 10) to search for pubkey
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
        space = std::mem::size_of::<MatchedOrdersAddress>() + 8,
        seeds = [b"matched_orders", exhibit.key().as_ref()], bump
    )]
    pub matched_orders_address: Account<'info, MatchedOrdersAddress>,

    #[account(init,
        payer = user,
        space = std::mem::size_of::<BidOrders>() + 8,
        seeds = [b"bid_orders", exhibit.key().as_ref()], bump
    )]
    pub bid_orders: AccountLoader<'info, BidOrders>,

    #[account(init, payer = user, space = 8+std::mem::size_of::<CheckoutAuth>(), seeds=[b"auth", exhibit.key().as_ref()], bump)]
    pub auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        seeds = [b"escrow_voucher", auth.key().as_ref()],
        token::mint = voucher_mint,
        token::authority = auth,
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
    pub exhibition_program: Program<'info, Exhibition>,
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
pub struct BidFloor<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut)]
    pub matched_orders: AccountLoader<'info, MatchedOrders>,

    #[account(mut,
        has_one = matched_orders,
        seeds = [b"matched_orders", exhibit.key().as_ref()], bump
    )]
    pub matched_orders_address: Account<'info, MatchedOrdersAddress>,

    #[account(mut,
        seeds = [b"bid_orders", exhibit.key().as_ref()], bump
    )]
    pub bid_orders: AccountLoader<'info, BidOrders>,

    #[account(mut, seeds=[b"auth", exhibit.key().as_ref()], bump)]
    pub auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = voucher_mint,
        token::authority = auth,
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
#[instruction(pubkey_to_remove: Pubkey, auth_bump: u8)]
pub struct FulfillOrder<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut)]
    pub matched_orders: AccountLoader<'info, MatchedOrders>,

    #[account(mut,
        has_one = matched_orders,
        seeds = [b"matched_orders", exhibit.key().as_ref()], bump
    )]
    pub matched_orders_address: Account<'info, MatchedOrdersAddress>,

    #[account(mut, seeds=[b"auth", exhibit.key().as_ref()], bump)]
    pub auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = voucher_mint,
        token::authority = auth,
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
    pub trades: LinkedList,
}

#[account]
#[derive(Default)]
pub struct CheckoutAuth {}

#[account]
#[derive(Default)]
pub struct MatchedOrdersAddress {
    pub matched_orders: Pubkey,
}

#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct BidOrders {
    pub authority: Pubkey, // 32
    pub heap: Heap,        // 1,544 bytes
    pub bump: u8,          // stores the bump for the PDA
}

#[account]
#[derive(Default)]
pub struct SolWallet {}
