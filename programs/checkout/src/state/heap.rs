use std::fmt::{self, Debug, Display, Formatter};
/*
Cleaner, recursive, implementation of Caravan's heap
*/
use anchor_lang::prelude::*;

/*
48 bytes
*/
#[zero_copy]
#[derive(Default, Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct HeapNode {
    pub sequence_number: u64,  // 8 bytes
    pub bid_price: u64,        // 8 bytes
    pub bidder_pubkey: Pubkey, // 32 bytes
}

/*
1,544 bytes
32 items
*/
#[zero_copy]
#[derive(Default, Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct Heap {
    pub size: u64,             // 8 bytes
    pub items: [HeapNode; 32], // 1,536 byes
}

impl Heap {
    fn swap_node(arr: &mut [HeapNode; 32], parent_idx: usize, added_idx: usize) {
        let temp = arr[parent_idx];
        arr[parent_idx] = arr[added_idx];
        arr[added_idx] = temp;
    }
    // works
    pub fn is_empty(&self) -> bool {
        return self.size == 0;
    }

    // works
    pub fn size(&self) -> u64 {
        return self.size;
    }

    // zero-indexed recursive implementation of heapify up
    fn heapifyup(&mut self, index: usize) {
        // base case 1: where the heap was empty
        if self.size == 1 {
            return;
        }
        // base case 2: index is 0
        if index == 0 {
            return;
        }
        let index: usize = index;
        let parent_index = (index - 1) / 2;

        if self.items[index].bid_price > self.items[parent_index].bid_price {
            Self::swap_node(&mut self.items, index, parent_index);
            self.heapifyup(parent_index)
        }
        if self.items[index].bid_price == self.items[parent_index].bid_price {
            if self.items[index].sequence_number < self.items[parent_index].sequence_number {
                Self::swap_node(&mut self.items, index, parent_index);
                return;
            } else {
                return;
            }
        } else {
            return;
        }
    }

    // zero-indexed
    fn heapifydown(&mut self, rootidx: usize) {
        let rootidx = rootidx;
        let left_childidx = (2 * rootidx) + 1;
        let right_childidx = (2 * rootidx) + 2;

        // if the right_child exists, then by definition, the right child must exist
        if right_childidx <= self.size as usize {
            // mini-max
            // if left greatest
            if self.items[left_childidx].bid_price > self.items[right_childidx].bid_price {
                // if left greater than root
                if self.items[left_childidx].bid_price > self.items[rootidx].bid_price {
                    Self::swap_node(&mut self.items, rootidx, left_childidx);
                    self.heapifydown(left_childidx)
                }
                // if right greatest
            } else if self.items[right_childidx].bid_price > self.items[left_childidx].bid_price {
                // if right greater than root
                if self.items[right_childidx].bid_price > self.items[rootidx].bid_price {
                    Self::swap_node(&mut self.items, rootidx, right_childidx);
                    self.heapifydown(right_childidx)
                }
            } else if self.items[left_childidx].bid_price == self.items[right_childidx].bid_price {
                if self.items[left_childidx].bid_price > self.items[rootidx].bid_price {
                    if self.items[left_childidx].sequence_number
                        < self.items[right_childidx].sequence_number
                    {
                        Self::swap_node(&mut self.items, rootidx, left_childidx);
                        self.heapifydown(left_childidx)
                    } else {
                        Self::swap_node(&mut self.items, rootidx, right_childidx);
                        self.heapifydown(right_childidx)
                    }
                }
            }
        } else {
            // right doesn't exist, no need to check right
            if self.items[left_childidx].bid_price > self.items[rootidx].bid_price {
                Self::swap_node(&mut self.items, rootidx, left_childidx);
                self.heapifydown(left_childidx)
            }
        }
    }

    /*
    TODO : make sure that if bidder is not found that it is not cancelled
    */
    pub fn cancel_bid(&mut self, bidder_pubkey: Pubkey) -> u64 {
        let mut index = 0;
        for elem in self.items {
            if elem.bidder_pubkey == bidder_pubkey {
                break;
            }
            index += 1;
        }

        // Bidder does not have an order active
        if index == self.items.len() {
            0
            // panic!("User trying to cancel does not have a bid!")
        } else {
            Self::swap_node(&mut self.items, index, (self.size - 1) as usize);

            let bid_price = self.items[(self.size - 1) as usize].bid_price;

            self.items[(self.size - 1) as usize] = HeapNode::default();

            self.size -= 1;

            self.heapifydown(index);

            bid_price
        }
    }

    pub fn add(&mut self, price: u64, pubkey: Pubkey) {
        let sequence_number = self.size;

        let bid = HeapNode {
            sequence_number: sequence_number,
            bid_price: price,
            bidder_pubkey: pubkey,
        };

        let last = self.size as usize;

        self.items[last] = bid;

        self.size += 1;
        // maintains the max heap structure
        self.heapifyup(last);
    }

    pub fn pop_highest_bid(&mut self) -> HeapNode {
        let lastidx = (self.size - 1) as usize;

        Self::swap_node(&mut self.items, 0, lastidx);

        let highest_bid = self.items[lastidx];

        self.items[(self.size - 1) as usize] = HeapNode::default();

        self.size -= 1;

        self.heapifydown(0);

        highest_bid
    }
}

impl Display for HeapNode {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(
            f,
            "HeapNode: seq number {} bid price {} bidder pub {}",
            self.sequence_number, self.bid_price, self.bidder_pubkey
        )
    }
}

impl Display for Heap {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let mut output = Vec::new();

        // let mut cur_node_index = self.order_head;

        for i in 0..10 {
            // println!("HeapNode: {}", self.items[i as usize]);
            output.push(&self.items[i as usize])
        }

        // while cur_node_index != SENTINEL {
        //     output.push(&self.orders[cur_node_index as usize].val);
        //     // println!("cur node {}", self.orders[cur_node_index]);
        //     cur_node_index = self.orders[cur_node_index as usize].next;
        //     // println!("next? {}", cur_node_index);
        // }

        write!(f, "output: {:?}", output)
    }
}
