use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

pub mod state;
use state::linked_list::LinkedList;

declare_id!("8uRUPQtyoC3XvQp8Rg8cG2py4AiqRodqrSurU3GxcnVX");

#[program]
pub mod checkout {
    use super::*;

    pub fn set_data(ctx: Context<SetData>, string_to_set: String) -> Result<()> {
        msg!("in set data");
        ctx.accounts.data_holder.load_mut()?.greet_string[..string_to_set.chars().count()]
            .clone_from_slice(string_to_set.as_bytes());
        msg!("greet string set successfully");
        Ok(())
    }

    pub fn set_data2(_ctx: Context<SetData2>, pubkey_to_set: Pubkey) -> Result<()> {
        msg!("in set data2");
        msg!("Pubkey: {}", pubkey_to_set.to_string());

        // let mut list = LinkedList::<Pubkey>::new();
        // list.insert_at_tail(pubkey_to_set);
        // ctx.accounts.linked_holder.load_mut()?.trades = list;
        // let mut node = TestNode::new(pubkey_to_set);

        // msg!("node dat?: {}", node.val);

        // ctx.accounts.linked_holder.load_mut()?.trades[..1].clone_from_slice(&[node]);

        // msg!(
        //     "linked holder data {:?}",
        //     ctx.accounts.linked_holder.load()?.trades
        // );

        msg!("greet string set successfully");
        Ok(())
    }

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
    #[account(init,    seeds = [b"data_holder_v0", author.key().as_ref()], bump, payer=author, space= 10 * 1024 as usize)]
    pub data_holder: AccountLoader<'info, DataHolder>,

    #[account(init,
              seeds = [b"data_holder_v1",      author.key().as_ref()], bump, payer=author,    space = 8 + std::mem::size_of::<LinkedHolder>())]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,

    #[account(mut)]
    pub author: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetData<'info> {
    #[account(mut)]
    pub data_holder: AccountLoader<'info, DataHolder>,
    #[account(mut)]
    pub writer: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetData2<'info> {
    #[account(mut)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,
    #[account(mut)]
    pub writer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReadData<'info> {
    #[account(mut)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,
    #[account(mut)]
    pub writer: Signer<'info>,
}

#[account(zero_copy)]
#[repr(packed)]
pub struct DataHolder {
    pub greet_string: [u8; 920],
}

#[account(zero_copy)]
#[repr(packed)]
pub struct LinkedHolder {
    pub trades: LinkedList<Pubkey>,
}
