use anchor_lang::prelude::*;
use std::cmp::PartialEq;
use std::default::Default;
use std::fmt::{self, Debug, Display, Formatter};

#[constant]
pub const MAX_OPEN_ORDERS: usize = 1024;
#[constant]
pub const SENTINEL: usize = 0;

#[zero_copy]
#[derive(Default, Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct Node<T> {
    pub val: T,
    pub prev: usize,
    pub next: usize,
}

#[zero_copy]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct LinkedList<T> {
    pub free_head: usize,
    pub order_head: usize,
    pub orders: [Node<T>; MAX_OPEN_ORDERS],
}

impl<T: std::default::Default> LinkedList<T>
where
    Node<T>: std::marker::Copy,
{
    pub fn initialize() -> Self {
        Self {
            free_head: 1,
            order_head: 0,
            orders: [Node::default(); MAX_OPEN_ORDERS],
        }
    }

    pub fn insert_node(&mut self, obj: T) {
        let free_node = &mut self.orders[self.free_head];
        let next_free_node = free_node.next;

        free_node.val = obj;
        free_node.next = self.order_head;
        free_node.prev = SENTINEL;

        if self.order_head != SENTINEL {
            self.orders[self.order_head].prev = self.free_head;
        }
        self.order_head = self.free_head;

        if next_free_node == SENTINEL {
            // Current portion of array is densely packed
            // Next free node is just next index

            assert!(self.free_head + 1 < MAX_OPEN_ORDERS, "Too many open orders");
            self.free_head = self.free_head + 1;
        } else {
            // There are free nodes remaining

            self.free_head = next_free_node;
        }

        println!(
            "List status: free head {}, order head {}",
            self.free_head, self.order_head
        );
        // self.orders[index].val = obj;
    }

    pub fn remove_node(&mut self, i: usize) {
        let node = &mut self.orders[i];

        let next = node.next;
        let prev = node.prev;

        println!("next {} prev {}", next, prev);
        if prev == SENTINEL {
            println!("removing head");
            // If we enter this block, we are removing the head, so need to stop tracking this
            self.order_head = next;
        }

        node.val = Default::default();
        node.next = self.free_head;
        node.prev = SENTINEL;
        println!("next: {}, prev: {}", &node.next, &node.prev);
        // println!("after node clearing {}", node);

        self.free_head = i;
        self.orders[self.free_head].prev = i;

        // TODO the prev after removing is wrong
        if next != SENTINEL {
            println!("is not tail");
            self.orders[next].prev = prev;
        }
        if prev != SENTINEL {
            println!("is not head");
            self.orders[prev].next = next;
        }

        println!(
            "List status: free head {}, order head {}",
            self.free_head, self.order_head
        );
    }
}

impl<T> Display for LinkedList<T>
where
    T: Display + PartialEq + Default + Debug,
{
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let mut output = Vec::new();

        let mut cur_node_index = self.order_head;

        for i in 0..10 {
            println!("Node: {}", self.orders[i]);
        }
        while cur_node_index != SENTINEL {
            output.push(&self.orders[cur_node_index].val);
            // println!("cur node {}", self.orders[cur_node_index]);
            cur_node_index = self.orders[cur_node_index].next;
            // println!("next? {}", cur_node_index);
        }

        write!(f, "{:?}", output)
    }
}

impl<T> Display for Node<T>
where
    T: Display + PartialEq + Default + Debug,
{
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(
            f,
            "Node: val {:?} prev {} next {}",
            self.val, self.prev, self.next
        )
    }
}

#[cfg(test)]
mod tests {

    use super::LinkedList;

    #[test]
    fn insert_node_works() {
        let mut list = LinkedList::<u8>::initialize();
        list.insert_node(1);
        list.insert_node(2);
        list.insert_node(3);
        list.insert_node(4);

        println!("Linked list is \n{}", list);
    }

    #[test]
    fn remove_node_works() {
        let mut list = LinkedList::<u8>::initialize();
        list.insert_node(1);
        list.insert_node(2);
        list.insert_node(3);
        list.insert_node(4);
        // println!("Linked list is \n{}\n\n", list);

        list.remove_node(1);
        list.remove_node(4);

        // println!("Linked list is \n{}", list);

        list.insert_node(5);
        println!("Linked list is \n{}", list);

        // list.insert_node();
    }
}
