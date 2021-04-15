import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  
  const addProduct = async (productId: number) => {
    let fecthErrorIdentifier = 0
    try {

      // Pegar dados do estoque e dos produtos
      const stockResponse = await api.get(`/stock/${productId}`)
      const stock: Stock = stockResponse.data
      
      // Atualizar o identificador do erro para 1, caso não dê erro na primeira requisição
      fecthErrorIdentifier = 1

      const productResponse = await api.get(`/products/${productId}`)
      const product: Product = productResponse.data
      
      // Ver se o produto tem em estoque
      const productAmountInStock = stock.amount

      if(productAmountInStock <= 1){
        throw new Error('Quantidade solicitada fora de estoque')
      }
      
      const productInCartAmount = cart.find(product=> product.id === productId)?.amount

      if(productInCartAmount){
        if(productInCartAmount >= productAmountInStock){
          throw new Error('Quantidade solicitada fora de estoque')
        }
      }

      // Ver se o produto já está no carrinho
      const isProductAlreadyInCart = cart
        .find(product=> product.id===productId)

      // Se o produto já estiver no carrinho... senão
      if(isProductAlreadyInCart){
        const newCart = cart.map(
          product=>{
            if (product.id !== productId) {return product}

            return{
              ...product,
              amount: product.amount + 1,
            }
          })
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        } else{
          const productToBeAdded = product
              
          if(!productToBeAdded){
            throw new Error('Não foi possível adicionar item ao carrinho')
          }
          
          const newCart = [...cart, {...productToBeAdded, amount: 1}]
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }

    } catch(error) {
        if((error as Error).message === "Request failed with status code 404"){
          if(fecthErrorIdentifier === 0){
            toast.error('Erro na adição do produto')
          } else{
            toast.error('Quantidade solicitada fora de estoque')
          }
        } else {
          toast.error((error as Error).message)
        }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Filtrar o vetor do carrinho, para exlcuir o produto
      const newCart = cart.filter(product=> product.id !== productId);
      if(newCart.length === cart.length){
        throw new Error('Não foi possível deletar o produto')
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      // Pegar dados do estoque 
      const stockResponse = await api.get(`/stock/${productId}`)
      const stock: Stock = stockResponse.data
      
      // Buscar o produto no carrinho que será editidado, e retornar erro se não encontrá-lo
      const productToBeEdited = cart.find(product=> product.id === productId)
      if(!productToBeEdited){
        throw new Error('Erro na alteração de quantidade do produto')
      }

      // Não permitir que o produto no carrinho fique com menos de 1 unidade 
      if(amount <= 1){
        throw new Error('Não é possível diminuir de 1 a quantidade do produto')
      }

      // Acessar a quantidade em estoque e retornar erro se não for válida
      const amountInStock = stock.amount
      if(amountInStock <= 0){
        throw new Error('Quantidade solicitada fora de estoque')
      }
      if(amount >= amountInStock){
        throw new Error('Quantidade solicitada fora de estoque')
      }

      // Atualizar o vetor do carrinho com o valor de quantidade já editado
      const newCart = cart.map(
        product=>{
          if (product.id !== productId) {return product}

          return{
            ...product,
            amount,
          }
        })
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      
    } catch(error) {
      if((error as Error).message === "Request failed with status code 404"){
        toast.error('Erro na alteração de quantidade do produto')
      } else {
        toast.error((error as Error).message)
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
