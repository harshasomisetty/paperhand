use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod nftamm {
    use super::*;

    pub fn initialize_pool(ctx: Context<Initialize_Pool>) -> Result<()> {
        // setup a general collection pool account
        // needs to be able to access vaults

        // create token mint
        // initialize a swap
        //
        Ok(())
    }

    pub fn vault_insert(ctx: Context<Vault_Insert>) -> Result<()> {
        // take in nft address?
        // create a pda, send nft to pda
        // increment pool address counter or method of tracking stored count of nfts


        // generate a representative token 
        Ok(())
    }

    pub fn vault_withdraw(ctx: Context<Vault_Withdraw>) -> Result<()> {
        // take in nft address to withdraw?
        // send out nft from pda to user account
        // decrement pool address counter or method of tracking stored count of nfts
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(collection_id: String)]
pub struct Initialize_Pool {
    #[account(init, payer = signer, seeds = [b"collection_pool".as_ref(), collection_id.as_ref()], bump)]
    pub collection_pool: Account<'info, CollectionPool>,

#[account(init, payer = signer)]
    pub redeem_token_mint: Account<'info, Mint>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Vault_Insert {}

#[derive(Accounts)]
pub struct Vault_Withdraw {}

#[account]
#[derive(Default)]
pub struct CollectionPool {}

#[account]
#[derive(Default)]
pub struct VaultAccount {}



// todo find conversion ration between 
