use crate::state::accounts::{Booth, CarnivalAccount};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(booth_owner: Pubkey, booth_id: u64, spot_price: u64, curve: u8, booth_type: u8, delta: u64, fee: u16)]
pub struct CreateBooth<'info> {
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
        space = std::mem::size_of::<Booth>() + 8,
        seeds = [b"booth", carnival.key().as_ref(), booth_id.to_le_bytes().as_ref()],
        bump
    )]
    pub booth: Account<'info, Booth>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseBooth<'info> {
    /// CHECK: just reading pubkey
    pub exhibit: AccountInfo<'info>,
}
pub fn create_booth(
    ctx: Context<CreateBooth>,
    booth_owner: Pubkey,
    booth_id: u64,
    spot_price: u64,
    curve: u8,
    booth_type: u8,
    delta: u64,
    fee: u16,
) -> Result<()> {
    msg!("in create booth");
    let mut booth = &mut ctx.accounts.booth;

    assert_eq!(booth_id, ctx.accounts.carnival.booth_id_count);

    booth.spot_price = spot_price;
    booth.booth_id = ctx.accounts.carnival.booth_id_count;
    booth.booth_owner = booth_owner;
    booth.curve = curve;
    booth.booth_type = booth_type;
    booth.delta = delta;
    booth.fee = fee;

    msg!(
        "prev booth id count: {}",
        ctx.accounts.carnival.booth_id_count
    );
    ctx.accounts.carnival.booth_id_count = ctx.accounts.carnival.booth_id_count + 1;

    Ok(())
}

pub fn close_booth(ctx: Context<CloseBooth>, booth_owner: Pubkey, booth_id: u64) -> Result<()> {
    msg!("in close booth");

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
