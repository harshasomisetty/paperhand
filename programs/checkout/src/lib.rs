use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use solana_program;
use solana_program::{account_info::AccountInfo, program_option::COption};

use exhibition::program::Exhibition;
use exhibition::{self, Exhibit};

pub mod state;
use state::linked_list::LinkedList;

declare_id!("8uRUPQtyoC3XvQp8Rg8cG2py4AiqRodqrSurU3GxcnVX");

#[program]
pub mod checkout {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, auth_bump: u8) -> Result<()> {
        msg!("In initializer");

        msg!(
            "ehxibiotn prof id {}",
            ctx.accounts
                .exhibition_program
                .to_account_info()
                .key()
                .to_string()
        );

        let list = LinkedList::initialize();

        let mut linked_holder = ctx.accounts.linked_holder.load_init()?;

        linked_holder.trades = list;

        msg!("linked holder data {:?}", &linked_holder.trades.order_head);
        Ok(())
    }

    pub fn add_order(ctx: Context<AddOrder>, pubkey_to_add: Pubkey, auth_bump: u8) -> Result<()> {
        msg!("in set_data pubkey: {}", &pubkey_to_add.to_string());

        let mut linked_holder = ctx.accounts.linked_holder.load_mut()?;

        linked_holder.trades.insert_node(pubkey_to_add);

        msg!(
            "linked holder data {:?}, {:?}",
            linked_holder.trades.free_head,
            linked_holder.trades.order_head
        );

        msg!("voucher balance {}", ctx.accounts.user_voucher.amount);

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.user_voucher.to_account_info(),
                    to: ctx.accounts.checkout_voucher.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            1,
        )?;

        Ok(())
    }

    pub fn remove_order(
        ctx: Context<RemoveOrder>,
        pubkey_to_remove: Pubkey,
        auth_bump: u8,
    ) -> Result<()> {
        msg!("in remove_order pubkey: {}", &pubkey_to_remove.to_string());

        let mut linked_holder = ctx.accounts.linked_holder.load_mut()?;
        linked_holder.trades.remove_node_by_pubkey(pubkey_to_remove);

        // TODO get seeds of pda?
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.checkout_voucher.to_account_info(),
                    to: ctx.accounts.user_voucher.to_account_info(),
                    authority: ctx.accounts.checkout_auth.to_account_info(),
                },
                &[&[
                    b"checkout_auth",
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

#[derive(Accounts)]
#[instruction(auth_bump: u8)]

pub struct Initialize<'info> {
    #[account(zero)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,

    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(init, payer = user, space = 8+std::mem::size_of::<CheckoutAuth>(), seeds=[b"checkout_auth", exhibit.key().as_ref()], bump)]
    pub checkout_auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        seeds = [b"checkout_voucher", checkout_auth.key().as_ref()],
        token::mint = voucher_mint,
        token::authority = checkout_auth,
        bump
    )]
    pub checkout_voucher: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub exhibition_program: Program<'info, Exhibition>,
}

#[derive(Accounts)]
#[instruction(pubkey_to_remove: Pubkey, auth_bump: u8)]

pub struct AddOrder<'info> {
    #[account(mut)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,

    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds=[b"checkout_auth", exhibit.key().as_ref()], bump = auth_bump)]
    pub checkout_auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = voucher_mint,
        token::authority = checkout_auth,
    )]
    pub checkout_voucher: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = user
    )]
    pub user_voucher: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(pubkey_to_remove: Pubkey, auth_bump: u8)]
pub struct RemoveOrder<'info> {
    #[account(mut)]
    pub linked_holder: AccountLoader<'info, LinkedHolder>,

    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,

    #[account(mut, seeds=[b"checkout_auth", exhibit.key().as_ref()], bump)]
    pub checkout_auth: Account<'info, CheckoutAuth>,

    #[account(mut)]
    pub voucher_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = voucher_mint,
        token::authority = checkout_auth,
    )]
    pub checkout_voucher: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = voucher_mint,
        associated_token::authority = user
    )]
    pub user_voucher: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// TODO consider case when ATA owner is not the pubkey, if you don't check owner its "fine" but wrong person gets the voucher, but if the ownership doens't match, just make a new token account.

// conrract side check token acocunt owner

#[account(zero_copy)]
#[repr(C)]
pub struct LinkedHolder {
    pub trades: LinkedList,
}

#[account]
#[derive(Default)]
pub struct CheckoutAuth {}
