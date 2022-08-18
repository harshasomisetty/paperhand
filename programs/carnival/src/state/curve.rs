use anchor_lang::prelude::*;

// https://medium.com/linum-labs/intro-to-bonding-curves-and-shapes-bf326bc4e11a
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub enum CurveType {
    Linear,
    Exponential,
    // Sigmoid,
    // Taxation
}

impl Default for CurveType {
    fn default() -> Self {
        CurveType::Linear
    }
}

// function that can be plugged into, provided details of cur inventory, delta, fee, etc that can calculate next bid/ask
