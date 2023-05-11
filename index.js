// Your task is to build a mini-version of Rutter.
// Rutter standardizes different Ecommerce APIs by fetching data from third-party APIs 
// and then transforming the output to conform to a Rutter-defined schema.
require('dotenv').config();
const axios = require('axios');
const connection = require('./connection');
const tables = require('./tables');

class Shopify{
  constructor(){
    this.accessToken = process.env['access_token'];
    this.storeUrl = process.env['store_url'];
    this.productsInitialUrl = `${this.storeUrl}/admin/api/2022-04/products.json?limit=50`;
    this.ordersInitialUrl = `${this.storeUrl}/admin/api/2022-04/orders.json?status=any&limit=50`
  }
  
  async getProductsFromShopify(url_req = this.productsInitialUrl){
    try {
      const response = await axios({
        method: 'GET',
        url: url_req,
        headers: {
          'X-Shopify-Access-Token': this.accessToken
        }
      });
  
      const products = await response.data.products;
      const handled_products = products.map(product => {
        return {
          id: product.id,
          title: product.title
        }
      })
      this.storeProducts(handled_products)
      
      if(response.headers.link){
        const links = response.headers.link.split(',').map(str => str.split('; '));
        const nextLink = links.find(link => link[1] === 'rel="next"');
        if(nextLink){
          const nextUrl = nextLink[0].replace("<", "").replace(">", "");
          await this.getProductsFromShopify(String(nextUrl));
        }
      }

    } catch (error) {
      console.log(error)
    }
}

  async storeProducts(products){
    try {
      connection.run(`INSERT OR IGNORE INTO products(shopify_id, title) VALUES 
          ${products.map(product => `(${product.id}, "${product.title}")`).join(',')}`);
    } catch (error) {
      console.log(error)
    }
  }
  
  getProducts(){
    return new Promise((resolve, reject) => {
      connection.all("SELECT * FROM products", [], (err, rows) => {
        if (err) {
          throw err;
        }
        let final_products = rows.map(row => {
          return {
            id: row.id,
            platform_id: row.shopify_id,
            name: row.title
          }
        })
        resolve(final_products);
      });
    });
  }

  async getOrdersFromShopify(url_req = this.ordersInitialUrl){
    
    try {
      const response = await axios({
        method: 'GET',
        url: url_req,
        headers: {
          'X-Shopify-Access-Token': this.accessToken
        }
      });
  
      const orders = await response.data.orders;
      const handled_orders = orders.map(order => {
        return {
          id: order.id,
          line_items: order.line_items.map(line_item => {
            return '{"product_id": '+ line_item.product_id + '}'
          }).join(',')
        }
      });
      await this.storeOrders(handled_orders)
      
      if(response.headers.link){
        const links = response.headers.link.split(',').map(str => str.split('; '));
        const nextLink = links.find(link => link[1] === 'rel="next"');
        if(nextLink){
          const nextUrl = nextLink[0].replace("<", "").replace(">", "");
          await this.getOrdersFromShopify(String(nextUrl));
        }
      }

    } catch (error) {
      console.log(error)
    }
  }

  async storeOrders(orders){
    try {
      let qty_orders = await this.countOrders();
      if(parseInt(orders.length) + parseInt(qty_orders) < 501){
        await connection.run(`INSERT OR IGNORE INTO orders(shopify_id, line_items) VALUES
        ${orders.map(order => `(${order.id}, '${order.line_items}')`).join(',')}`);
      }else{
        console.log('Max record limit reached');
      }
      
    } catch (error) {
      console.log(error)
    }
  }

  getOrders() {
    return this.getProducts().then(products => {
      return new Promise((resolve, reject) => {
        connection.all("SELECT * FROM orders", [], (err, rows) => {
          if (err) {
            reject(err);
          }
          let final_orders = rows.map(row => {
            return {
              id: row.id,
              platform_id: row.shopify_id,
              line_items: row.line_items.split(',').map(eachItem => {
                let productFound = products.find(obj => obj.platform_id === JSON.parse(eachItem).product_id)
                return { "product_id": !!productFound ? productFound.id : null };
              })
            }
          })
          resolve(JSON.stringify(final_orders, null, 2));
        });
      });
    }).catch(err => {
      console.error(err);
    });
  }

  countOrders() {
    return this.getProducts().then(products => {
      return new Promise((resolve, reject) => {
        connection.all("SELECT count(*) as qty_orders FROM orders", [], (err, rows) => {
          if (err) {
            reject(err);
          }
          resolve(rows[0].qty_orders);
        });
      });
    }).catch(err => {
      console.error(err);
    });
  }

  async clearTables() {
    await connection.run('DELETE FROM orders');
    await connection.run('Delete FROM products');
    console.log('The tables have been cleared');
  }
}

(async () => {
  const shopifyClass = new Shopify;
  // await shopifyClass.getProductsFromShopify(); //Enable to populate the database
  // await shopifyClass.getOrdersFromShopify();  //Enable to populate the database
  
  console.log(await shopifyClass.getProducts());
  console.log(await shopifyClass.getOrders());
  
  // shopifyClass.clearTables(); //Activate to clean up the database
})();