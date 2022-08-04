use anchor_lang::prelude::*;

pub mod state;
use state::heap::Heap;
use solana_program;
use solana_program::{account_info::AccountInfo, program::invoke};
use solana_program::{native_token::LAMPORTS_PER_SOL, system_instruction};

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

    pub fn createbinaryheap(ctx: Context<CreateBinaryHeap>) -> Result<()>  {
        let _heap = &mut ctx.accounts.nft_heap.load_init()?;
        Ok(())
    }

    /*
    To do -> transfer SOL from bidder to heap
    */
    pub fn makebid(ctx: Context<MakeBid>, bid_price: u64) -> Result<()> {
        let bidder = &ctx.accounts.bidder;

        let bid_price_sol = bid_price * LAMPORTS_PER_SOL;

        invoke(
            &system_instruction::transfer(&ctx.accounts.bidder.key(), &ctx.accounts.nft_heap.key(), bid_price_sol)
            ,
            &[
                ctx.accounts.nft_heap.to_account_info(),
                ctx.accounts.bidder.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ]);

        let heap = &mut ctx.accounts.nft_heap.load_mut()?;

        heap.heap.add(bid_price, bidder.key());

        Ok(())
    }

    /*
    Transfer SOL from heap to bidder
    */
    pub fn cancelbid(ctx: Context<CancelBid>) -> Result<()> {
        let bidder = &ctx.accounts.bidder;   

        let mut heap = ctx.accounts.nft_heap.load_mut()?;

        // Need a clever way to somehow know the bid price after the let mut heap declaration
        let bid_price_sol =  heap.heap.cancelnftbid(bidder.key()) * LAMPORTS_PER_SOL;

        **ctx.accounts.nft_heap.to_account_info().try_borrow_mut_lamports()? -= bid_price_sol;
        **ctx.accounts.bidder.try_borrow_mut_lamports()? += bid_price_sol;

        Ok(())
    }

    pub fn accepthighestbid(ctx: Context<AcceptHighestBid>) -> Result<()> {
        let buyer = &ctx.accounts.buyer;
    
        let mut heap = ctx.accounts.nft_heap.load_mut()?;
    
        let bid_price_sol = heap.heap.pophighestbid() * LAMPORTS_PER_SOL;
    
        invoke(
            &system_instruction::transfer(&ctx.accounts.buyer.key(), &ctx.accounts.nft_heap.key(), bid_price_sol)
            ,
            &[
                ctx.accounts.nft_heap.to_account_info(),
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ]);
    
        Ok(())
       }
}

pub const HEAP_SIZE: usize = std::mem::size_of::<NftHeap>() + 8;

#[derive(Accounts)]
pub struct CreateBinaryHeap<'info> {
    #[account(init,
        payer = initial_bidder,
        space = HEAP_SIZE, 
        seeds = [b"nft_heap"], bump
    )
        ]
    nft_heap: AccountLoader<'info, NftHeap>,
    #[account(mut)]
    initial_bidder: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeBid<'info> {
    #[account(mut)]
    nft_heap: AccountLoader<'info, NftHeap>,
    #[account(mut)]
    bidder: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBid<'info> {
    #[account(mut)]
    nft_heap: AccountLoader<'info, NftHeap>,
    #[account(mut)]
    bidder: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptHighestBid<'info> {
    #[account(mut)]
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
    pub heap: Heap, // 1,544 bytes
    pub bump: u8, // stores the bump for the PDA
}

#[cfg(test)]
pub mod test {
    use crate::HEAP_SIZE;
    #[test]
    fn space_test () {
        assert_eq!(HEAP_SIZE, 1576 + 8 + 8)
    }
}
