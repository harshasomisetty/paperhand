use anchor_lang::prelude::*;

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

pub fn trade_sol(ctx: Context<TradeSol>) -> Result<()> {
    // If specific, find booths nft belongs to
    // If any, loop through booths to find cheapest price

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
