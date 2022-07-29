use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

pub mod state;
use state::linked_list::LinkedList;

declare_id!("8uRUPQtyoC3XvQp8Rg8cG2py4AiqRodqrSurU3GxcnVX");

#[program]
pub mod checkout {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("In initializer");
        let list = LinkedList::initialize();

        let mut linked_holder = ctx.accounts.linked_holder.load_init()?;

        linked_holder.trades = list;

        // linked_holder.trades.order_head = 2;

        msg!("linked holder data {:?}", &linked_holder.trades.order_head);
        Ok(())
    }

    pub fn set_data(ctx: Context<SetData>, pubkey_to_set: Pubkey) -> Result<()> {
        msg!("in set_data pubkey: {}", &pubkey_to_set.to_string());

        let mut linked_holder = ctx.accounts.linked_holder.load_mut()?;

        linked_holder.trades.insert_node(pubkey_to_set);

        msg!(
            "linked holder data {:?}, {:?}",
            linked_holder.trades.free_head,
            linked_holder.trades.order_head
        );

        Ok(())
    }

    pub fn remove_order(ctx: Context<RemoveOrder>, pubkey_to_remove: Pubkey) -> Result<()> {
        msg!("in remove_order pubkey: {}", &pubkey_to_remove.to_string());

        let mut linked_holder = ctx.accounts.linked_holder.load_mut()?;
        linked_holder.trades.remove_node_by_pubkey(pubkey_to_remove);

        Ok(())
    }
    // TODO remove node based on pubkey
    // TODO which node indexes (10, 10) to search for pubkey
    //

    // pub fn read_data(ctx: Context<ReadData>) -> Result<()> {
    //     msg!("in set data");

    //     msg!(
    //         "linked holder data {:?}",
    //         ctx.accounts.linked_holder.load()?.trades
    //     );

    //     Ok(())
    // }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(zero)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,
}

#[derive(Accounts)]
pub struct SetData<'info> {
    #[account(mut)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,
    pub writer: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveOrder<'info> {
    #[account(mut)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,
    pub writer: Signer<'info>,
}

// TODO read token program code
// TODO consider case when ATA owner is not the pubkey, if you don't check owner its "fine" but wrong person gets the voucher, but if the ownership doens't match, just make a new token account.
// conrract side check token acocunt owner

// target token account

// if token account

#[account(zero_copy)]
#[repr(C)]
pub struct LinkedHolder {
    pub trades: LinkedList,
}
