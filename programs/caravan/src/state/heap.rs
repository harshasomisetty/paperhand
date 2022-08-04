/*
Non-general implementation of the nft_heap.rs.

bytemuck
*/
use anchor_lang::prelude::*;

#[zero_copy]
#[derive(Debug, Default)]
/*
48 bytes
*/
pub struct Node {
    pub sequence_number: u64,  // 8 bytes
    pub bid_price: u64,        // 8 bytes
    pub bidder_pubkey: Pubkey, // 32 bytes
}

/*
1,544 bytes
*/
#[zero_copy]
#[derive(Debug, Default)]
pub struct Heap {
    pub size: u64,         // 8 bytes
    pub items: [Node; 32], // 1,536 bytes
}

fn swap_node(arr: &mut [Node; 32], parent_idx: usize, added_idx: usize) {
    let temp = arr[parent_idx];
    arr[parent_idx] = arr[added_idx];
    arr[added_idx] = temp;
}

impl Heap {
    // works
    pub fn is_empty(&self) -> bool {
        return self.size == 0;
    }

    // works
    pub fn size(&self) -> u64 {
        return self.size;
    }

    // works + zero-indexed!
    fn heapifyup(&mut self) {
        // handles case where the heap was empty
        if self.size == 1 {
            return;
        }
        let mut index: usize = (self.size - 1) as usize;
        let mut parent_index = (index - 1) / 2;

        while parent_index >= 0 && self.items[index].bid_price >= self.items[parent_index].bid_price
        {
            if self.items[index].bid_price == self.items[parent_index].bid_price
                && self.items[index].sequence_number > self.items[parent_index].sequence_number
            {
                return;
            }
            // time priority
            if self.items[index].bid_price == self.items[parent_index].bid_price {
                // larger sequence number == later input input/interaction time with orderbook
                if self.items[index].sequence_number < self.items[parent_index].sequence_number {
                    swap_node(&mut self.items, parent_index, index);
                    index = parent_index;
                    if index != 0 {
                        parent_index = (index - 1) / 2
                    }
                }
            // price priority
            } else if self.items[index].bid_price > self.items[parent_index].bid_price {
                swap_node(&mut self.items, parent_index, index);
                index = parent_index;
                if index != 0 {
                    parent_index = (index - 1) / 2
                }
                // price is equal and sequence number of index is larger
            }
            {
                return;
            }
        }
    }

    // works + zero-indexed
    fn heapifydown(&mut self, rootidx: usize) {
        let mut rootidx = rootidx;
        let mut left_childidx = (2 * rootidx) + 1;
        let mut right_childidx = (2 * rootidx) + 2;

        // make sure that we iterate through the entire tree
        while left_childidx <= self.size as usize {
            // you don't want to query the right node if there is not right node
            if right_childidx <= self.size as usize {
                // add edge case with the equal priced children that are both smaller than parent -> in this case the higher seq number gets fulfilled first.
                if self.items[left_childidx].bid_price == self.items[right_childidx].bid_price {
                    if self.items[left_childidx].bid_price > self.items[rootidx].bid_price {
                        if self.items[left_childidx].sequence_number
                            < self.items[right_childidx].sequence_number
                        {
                            swap_node(&mut self.items, rootidx, left_childidx);
                            rootidx = left_childidx;
                            left_childidx = (2 * rootidx) + 1;
                            right_childidx = (2 * rootidx) + 2;
                        } else {
                            swap_node(&mut self.items, rootidx, right_childidx);
                            rootidx = right_childidx;
                            left_childidx = (2 * rootidx) + 1;
                            right_childidx = (2 * rootidx) + 2;
                        }
                    } else {
                        return;
                    }
                }
                if self.items[left_childidx].bid_price > self.items[right_childidx].bid_price {
                    if self.items[left_childidx].bid_price > self.items[rootidx].bid_price {
                        swap_node(&mut self.items, rootidx, left_childidx);
                        rootidx = left_childidx;
                        left_childidx = (2 * rootidx) + 1;
                        right_childidx = (2 * rootidx) + 2;

                    // time priority left here
                    } else if self.items[left_childidx].bid_price == self.items[rootidx].bid_price {
                        if self.items[left_childidx].sequence_number
                            < self.items[rootidx].sequence_number
                        {
                            swap_node(&mut self.items, rootidx, left_childidx);
                            rootidx = left_childidx;
                            left_childidx = (2 * rootidx) + 1;
                            right_childidx = (2 * rootidx) + 2;
                        } else {
                            return;
                        }
                    // time priority right here
                    } else if self.items[right_childidx].bid_price == self.items[rootidx].bid_price
                    {
                        if self.items[right_childidx].sequence_number
                            < self.items[rootidx].sequence_number
                        {
                            swap_node(&mut &mut self.items, rootidx, right_childidx);
                            rootidx = right_childidx;
                            left_childidx = (2 * rootidx) + 1;
                            right_childidx = (2 * rootidx) + 2;
                        } else {
                            return;
                        }
                    } else {
                        return; // because we know that the root isnt bigger than the right child and that time priority case(s) are handled
                    }
                } else {
                    // check the right child since right is bigger
                    if self.items[right_childidx].bid_price > self.items[rootidx].bid_price {
                        swap_node(&mut &mut self.items, rootidx, right_childidx);
                        rootidx = right_childidx;
                        left_childidx = (2 * rootidx) + 1;
                        right_childidx = (2 * rootidx) + 2;
                    // TODO Insert time priority here!
                    } else if self.items[right_childidx].bid_price == self.items[rootidx].bid_price
                    {
                        if self.items[right_childidx].sequence_number
                            < self.items[rootidx].sequence_number
                        {
                            swap_node(&mut &mut self.items, rootidx, right_childidx);
                            rootidx = right_childidx;
                            left_childidx = (2 * rootidx) + 1;
                            right_childidx = (2 * rootidx) + 2;
                        } else {
                            return;
                        }
                    } else {
                        return;
                    }
                }
            } else {
                // only check the left child because the right child does not exist
                if self.items[left_childidx].bid_price > self.items[rootidx].bid_price {
                    swap_node(&mut &mut self.items, rootidx, left_childidx);
                    rootidx = left_childidx;
                    left_childidx = (2 * rootidx) + 1;
                    right_childidx = (2 * rootidx) + 2;

                // time priority left here (only left since left is the only available node)
                } else if self.items[left_childidx].bid_price == self.items[rootidx].bid_price {
                    if self.items[left_childidx].sequence_number
                        < self.items[rootidx].sequence_number
                    {
                        swap_node(&mut &mut self.items, rootidx, left_childidx);
                        rootidx = left_childidx;
                        left_childidx = (2 * rootidx) + 1;
                        right_childidx = (2 * rootidx) + 2;
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            }
        }
    }

    // this deletes the largest node in the heap, which is at index 0
    pub fn delete_highest_bid(&mut self) {
        swap_node(&mut self.items, 0, (self.size - 1) as usize);

        let last = (self.size - 1) as usize;
        // removes the largest element
        self.items[last] = Node::default();

        self.size -= 1;

        self.heapifydown(0);
    }

    /*
    Searches the array for the bid associated with a particular public key
    */
    pub fn cancelnftbid(&mut self, bidder_pubkey: Pubkey) {
        let mut index = 0;
        for elem in self.items {
            if elem.bidder_pubkey == bidder_pubkey {
                break;
            }
            index += 1;
        }
        swap_node(&mut self.items, index, (self.size - 1) as usize);

        let _bid_price = self.items[(self.size - 1) as usize].bid_price;

        self.items[(self.size - 1) as usize] = Node::default();

        self.size -= 1;

        self.heapifydown(index);
    }

    pub fn add(&mut self, price: u64, pubkey: Pubkey) {
        let sequence_number = self.size;

        let bid = Node {
            sequence_number: sequence_number,
            bid_price: price,
            bidder_pubkey: pubkey,
        };

        let last = self.size as usize;
        // starts at 1 so we can keep the 2n/2n + 1 structure
        self.items[last] = bid;

        self.size += 1;
        // maintains the max heap structure
        self.heapifyup()
    }
}

#[cfg(test)]
mod tests {
    use super::{Heap, Node};

    // test for additions
    #[test]
    fn handles_price_time_priority_adding_nodes() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let test_public_key = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key2 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key3 = anchor_lang::prelude::Pubkey::new_unique();

        nft_heap.add(5, test_public_key);
        nft_heap.add(5, test_public_key2);
        nft_heap.add(10, test_public_key3);

        assert_eq!(nft_heap.size, 3);
        assert_eq!(nft_heap.is_empty(), false);
        assert_eq!(nft_heap.items[0].bid_price, 10);
    }

    // test for deletions
    #[test]
    fn handles_price_time_priority_deleting_nodes() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let test_public_key = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key2 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key3 = anchor_lang::prelude::Pubkey::new_unique();

        nft_heap.add(5, test_public_key);
        nft_heap.add(5, test_public_key2);
        nft_heap.add(10, test_public_key3);
        /*
            10 (2)
           /  \
          /    \
        5 (1)   5 (0)
        */

        assert_eq!(nft_heap.size, 3);
        assert_eq!(nft_heap.items[0].sequence_number, 2);
        // should delete the highest node.
        nft_heap.delete_highest_bid();
        /*
            5 (0)
           /  \
          /    \
        5 (1)   Node::Default
        */

        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1)
    }

    #[test]
    fn test_highest_bid_deletion() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let test_public_key = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key2 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key3 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key4 = anchor_lang::prelude::Pubkey::new_unique();

        nft_heap.add(12, test_public_key);
        nft_heap.add(9, test_public_key2);
        nft_heap.add(16, test_public_key3);
        nft_heap.add(12, test_public_key4);

        /*
            16 (2)
             /  \
            /    \
        12 (3)   12 (0)
          /
        9 (1)
        */

        assert_eq!(nft_heap.items[0].sequence_number, 2);
        assert_eq!(nft_heap.items[1].sequence_number, 3);
        assert_eq!(nft_heap.items[2].sequence_number, 0);
        assert_eq!(nft_heap.items[3].sequence_number, 1);

        assert_eq!(nft_heap.size, 4);

        nft_heap.delete_highest_bid();

        /*
            12 (0)
             /  \
            /    \
        12 (3)   9 (1)
        */

        assert_eq!(nft_heap.size, 3);

        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 3);
        assert_eq!(nft_heap.items[2].sequence_number, 1);

        nft_heap.delete_highest_bid();
        /*
            12 (3)
             /
            /
        9 (1)
        */
        assert_eq!(nft_heap.items[0].sequence_number, 3);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
    }

    #[test]
    fn cancel_one_bid() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };
        let test_public_key0 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key1 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key2 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key3 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key4 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key5 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key6 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key7 = anchor_lang::prelude::Pubkey::new_unique();

        nft_heap.add(5, test_public_key0);
        nft_heap.add(5, test_public_key1);
        nft_heap.add(10, test_public_key2);
        nft_heap.add(4, test_public_key3);
        nft_heap.add(3, test_public_key4);
        nft_heap.add(2, test_public_key5);
        nft_heap.add(2, test_public_key6);
        nft_heap.add(3, test_public_key7);

        /*
             Schematic:

                    10(2)
                   /   \
                  /     \
              5(1)       5(0)
             /  \       /   \
            /    \     /     \
          4(3)  3(4)  2(5)    2(6)
          /
         /
        3(7)

          */

        /*
        Now we want to cancel the 5(1) bid -> let's use our cancelbid function to do this
        */
        nft_heap.cancelnftbid(test_public_key1);

        /*
           Schematic:

                  10(2)
                 /   \
                /     \
            4(3)       5(0)
           /  \       /   \
          /    \     /     \
        3(7)  3(4)  2(5)    2(6)

        */

        assert_eq!(nft_heap.items[0].sequence_number, 2);
        assert_eq!(nft_heap.items[1].sequence_number, 3);
        assert_eq!(nft_heap.items[2].sequence_number, 0);
        assert_eq!(nft_heap.items[3].sequence_number, 7);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        assert_eq!(nft_heap.items[6].sequence_number, 6);
    }

    #[test]
    fn cancel_multiple_bids() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let test_public_key0 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key1 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key2 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key3 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key4 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key5 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key6 = anchor_lang::prelude::Pubkey::new_unique();
        let test_public_key7 = anchor_lang::prelude::Pubkey::new_unique();

        /*
        Add four nodes
        */

        nft_heap.add(5, test_public_key0);
        nft_heap.add(5, test_public_key1);
        nft_heap.add(10, test_public_key2);
        nft_heap.add(4, test_public_key3);
        nft_heap.add(3, test_public_key4);
        nft_heap.add(2, test_public_key5);
        nft_heap.add(2, test_public_key6);
        nft_heap.add(3, test_public_key7);
        /*
             Schematic:

                    10 (2)
                   /   \
                  /     \
              5(1)       5(0)
             /  \       /   \
            /    \     /     \
          4(3)  3(4)  2(5)    2(6)
          /
         /
        3(7)

          */

        assert_eq!(nft_heap.items[0].sequence_number, 2);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 0);
        assert_eq!(nft_heap.items[3].sequence_number, 3);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        assert_eq!(nft_heap.items[6].sequence_number, 6);
        assert_eq!(nft_heap.items[7].sequence_number, 7);

        nft_heap.cancelnftbid(test_public_key2);
        assert_eq!(nft_heap.size, 7);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 3);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        assert_eq!(nft_heap.items[6].sequence_number, 6);

        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /  \       /   \
          /    \     /     \
        4(3)  3(4)  2(5)    2(6)

        */

        nft_heap.cancelnftbid(test_public_key3);
        assert_eq!(nft_heap.size, 6);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 6);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /  \       /
          /    \     /
        2(6)  3(4)  2(5)

        */

        nft_heap.cancelnftbid(test_public_key4);
        assert_eq!(nft_heap.size, 5);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 6);
        assert_eq!(nft_heap.items[4].sequence_number, 5);

        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /  \
          /    \
        2(6)  3(5)

        */

        nft_heap.cancelnftbid(test_public_key5);
        assert_eq!(nft_heap.size, 4);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 6);

        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /
          /
        2(6)

        */

        nft_heap.cancelnftbid(test_public_key6);
        /*
                  5 (0)
                 /   \
                /     \
            5(1)       3(7)

        */
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
    }
}
