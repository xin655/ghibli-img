const fetch = require('node-fetch');

// 测试价格ID匹配
async function testPriceIdMatching() {
  console.log('🧪 测试价格ID匹配...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 测试Enterprise价格ID
    console.log('📤 测试Enterprise价格ID...');
    const enterpriseEvent = {
      id: 'evt_test_enterprise_price',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_enterprise_price',
          object: 'subscription',
          status: 'active',
          customer: 'cus_T1NTQ2jS1V8XVZ',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_1S5KtNETPwR1qydLM0k0et1R', // Enterprise价格ID
                unit_amount: 4999, // $49.99
                currency: 'usd',
                recurring: {
                  interval: 'month',
                  interval_count: 1
                }
              },
              quantity: 1
            }]
          },
          currency: 'usd',
          cancel_at_period_end: false
        }
      }
    };

    console.log(`   价格ID: ${enterpriseEvent.data.object.items.data[0].price.id}`);
    console.log(`   金额: $${enterpriseEvent.data.object.items.data[0].price.unit_amount / 100}`);
    console.log(`   预期计划: enterprise`);

    const enterpriseResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(enterpriseEvent)
    });

    console.log(`   Webhook响应: ${enterpriseResponse.status}`);

    if (enterpriseResponse.ok) {
      console.log('   ✅ Enterprise价格ID测试成功');
    } else {
      console.log('   ❌ Enterprise价格ID测试失败');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试Pro价格ID
    console.log('\n📤 测试Pro价格ID...');
    const proEvent = {
      id: 'evt_test_pro_price',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_pro_price',
          object: 'subscription',
          status: 'active',
          customer: 'cus_T1NTQ2jS1V8XVZ',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_1S5Ks8ETPwR1qydL0zcZ1Wle', // Pro价格ID
                unit_amount: 1999, // $19.99
                currency: 'usd',
                recurring: {
                  interval: 'month',
                  interval_count: 1
                }
              },
              quantity: 1
            }]
          },
          currency: 'usd',
          cancel_at_period_end: false
        }
      }
    };

    console.log(`   价格ID: ${proEvent.data.object.items.data[0].price.id}`);
    console.log(`   金额: $${proEvent.data.object.items.data[0].price.unit_amount / 100}`);
    console.log(`   预期计划: pro`);

    const proResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(proEvent)
    });

    console.log(`   Webhook响应: ${proResponse.status}`);

    if (proResponse.ok) {
      console.log('   ✅ Pro价格ID测试成功');
    } else {
      console.log('   ❌ Pro价格ID测试失败');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 检查结果
    console.log('\n📊 检查价格ID匹配结果...');
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 订阅记录:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        console.log('   最新订阅记录:');
        subscriptionOrdersData.orders.slice(0, 3).forEach((order, index) => {
          console.log(`     ${index + 1}. 计划: ${order.plan}, 金额: $${order.amount/100} ${order.currency}, 状态: ${order.status}`);
        });
      }
    }

    console.log('\n🎉 价格ID匹配测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testPriceIdMatching();

