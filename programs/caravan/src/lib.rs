use anchor_lang::prelude::*;

pub mod state;
use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke};
use solana_program::{native_token::LAMPORTS_PER_SOL, system_instruction};
use state::heap::Heap;

declare_id!("8xHuptU9RNL6MsssM7Ty6u8WmSnFcdcJ1LNptxot9SNC");

#[program]
pub mod caravan {

    use solana_program::program::invoke_signed;

    use super::*;

    /*
    This initializes the orderbook and I also want to provide an authority for the heap -> Needs to be a PDA
    Each exhibit, which is tied to one collection has this orderbook heap which must have its own PDA.
    PDA seeds: b"max_heap, exhibit pubkey (?) Seems reasonable for keys
    */

    pub fn create_binary_heap(ctx: Context<CreateBinaryHeap>) -> Result<()> {
        // let _heap = &mut ctx.accounts.nft_heap.load_init()?;
        msg!("in create heap");
        Ok(())
    }

    /*
    To do -> transfer SOL from bidder to heap
    */
    pub fn make_bid(ctx: Context<MakeBid>, bid_price: u64) -> Result<()> {
        msg!("in make bid");

        let bidder = &ctx.accounts.bidder;

        let bid_price_sol = bid_price * LAMPORTS_PER_SOL;

        invoke(
            &system_instruction::transfer(
                &ctx.accounts.bidder.key(),
                &ctx.accounts.nft_heap.key(),
                bid_price_sol,
            ),
            &[
                ctx.accounts.nft_heap.to_account_info(),
                ctx.accounts.bidder.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        );

        let heap = &mut ctx.accounts.nft_heap.load_mut()?;

        heap.heap.add(bid_price, bidder.key());
        // msg!("heap data: {}", heap.heap);

        Ok(())
    }

    /*
    Transfer SOL from heap to bidder
    */
    pub fn cancel_bid(ctx: Context<CancelBid>) -> Result<()> {
        let bidder = &ctx.accounts.bidder;

        let mut heap = ctx.accounts.nft_heap.load_mut()?;

        // Need a clever way to somehow know the bid price after the let mut heap declaration
        let bid_price_sol = heap.heap.cancelnftbid(bidder.key()) * LAMPORTS_PER_SOL;

        **ctx
            .accounts
            .nft_heap
            .to_account_info()
            .try_borrow_mut_lamports()? -= bid_price_sol;
        **ctx.accounts.bidder.try_borrow_mut_lamports()? += bid_price_sol;

        // msg!("canceling heap data: {}", heap.heap);

        Ok(())
    }

    pub fn bid_floor(ctx: Context<BidFloor>) -> Result<()> {
        let mut heap = ctx.accounts.nft_heap.load_mut()?;

        let bid_price_sol = heap.heap.pophighestbid() * LAMPORTS_PER_SOL;

        invoke(
            &system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.nft_heap.key(),
                bid_price_sol,
            ),
            &[
                ctx.accounts.nft_heap.to_account_info(),
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateBinaryHeap<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(init,
        payer = signer,
        space = std::mem::size_of::<NftHeap>() + 8,
        seeds = [b"nft_heap", exhibit.key().as_ref()], bump
    )]
    nft_heap: AccountLoader<'info, NftHeap>,
    #[account(mut)]
    signer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeBid<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut,
        seeds = [b"nft_heap", exhibit.key().as_ref()], bump
    )]
    nft_heap: AccountLoader<'info, NftHeap>,
    #[account(mut)]
    bidder: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBid<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut,
        seeds = [b"nft_heap", exhibit.key().as_ref()], bump
    )]
    nft_heap: AccountLoader<'info, NftHeap>,

    #[account(mut)]
    bidder: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BidFloor<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut,
        seeds = [b"nft_heap", exhibit.key().as_ref()], bump
    )]
    nft_heap: AccountLoader<'info, NftHeap>,

    #[account(mut)]
    buyer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[account(zero_copy)]
#[repr(C)]
#[derive(Default)]
pub struct NftHeap {
    pub authority: Pubkey, // 32
    pub heap: Heap,        // 1,544 bytes
    pub bump: u8,          // stores the bump for the PDA
}
