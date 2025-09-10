const fetch = require('node-fetch');

// 分析订阅重复问题
async function analyzeSubscriptionDuplicates() {
  console.log('🔍 分析订阅重复问题...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 1. 检查所有订阅记录
    console.log('📋 检查所有订阅记录...');
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=50`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 订阅记录分析:');
      console.log(`   总订阅记录数: ${subscriptionOrdersData.pagination?.total || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        console.log('\n📊 详细订阅记录:');
        
        // 按计划类型分组统计
        const planStats = {};
        const subscriptionIds = new Set();
        const duplicateIds = new Set();
        
        subscriptionOrdersData.orders.forEach((order, index) => {
          console.log(`   ${index + 1}. 订单ID: ${order.orderId}`);
          console.log(`      计划: ${order.plan}`);
          console.log(`      金额: $${order.amount/100} ${order.currency}`);
          console.log(`      状态: ${order.status}`);
          console.log(`      创建时间: ${order.createdAt}`);
          console.log('');
          
          // 统计计划类型
          if (!planStats[order.plan]) {
            planStats[order.plan] = 0;
          }
          planStats[order.plan]++;
          
          // 检查重复的订阅ID
          if (subscriptionIds.has(order.orderId)) {
            duplicateIds.add(order.orderId);
            console.log(`   ⚠️ 发现重复订阅ID: ${order.orderId}`);
          } else {
            subscriptionIds.add(order.orderId);
          }
        });
        
        console.log('\n📈 计划类型统计:');
        Object.entries(planStats).forEach(([plan, count]) => {
          console.log(`   ${plan}: ${count}个订阅`);
        });
        
        console.log('\n🔍 重复订阅分析:');
        if (duplicateIds.size > 0) {
          console.log(`   ⚠️ 发现 ${duplicateIds.size} 个重复的订阅ID:`);
          duplicateIds.forEach(id => {
            console.log(`     - ${id}`);
          });
        } else {
          console.log('   ✅ 没有发现重复的订阅ID');
        }
        
        console.log('\n🎯 订阅唯一性分析:');
        console.log(`   唯一订阅ID数量: ${subscriptionIds.size}`);
        console.log(`   总订阅记录数: ${subscriptionOrdersData.orders.length}`);
        
        if (subscriptionIds.size === subscriptionOrdersData.orders.length) {
          console.log('   ✅ 所有订阅ID都是唯一的');
        } else {
          console.log('   ⚠️ 存在重复的订阅ID');
        }
      }
    }

    // 2. 分析CSV数据中的订阅
    console.log('\n📄 分析CSV数据中的订阅...');
    const csvSubscriptions = [
      { id: 'sub_1S5LEAETPwR1qydLEUKepjRw', plan: 'basic', amount: 9.99 },
      { id: 'sub_1S5LhfETPwR1qydLYfTnXbTH', plan: 'basic', amount: 9.99 },
      { id: 'sub_1S5LriETPwR1qydLRt7YQnqt', plan: 'pro', amount: 19.99 },
      { id: 'sub_1S5OnDETPwR1qydLRsX8hxLW', plan: 'enterprise', amount: 49.99 },
      { id: 'sub_1S5OwNETPwR1qydL8G8QXT9x', plan: 'basic', amount: 9.99 }
    ];
    
    console.log('📋 CSV中的订阅记录:');
    csvSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.id} - ${sub.plan} - $${sub.amount}`);
    });
    
    // 检查CSV中的重复
    const csvIds = csvSubscriptions.map(s => s.id);
    const uniqueCsvIds = new Set(csvIds);
    
    console.log('\n🔍 CSV订阅唯一性:');
    console.log(`   CSV订阅总数: ${csvSubscriptions.length}`);
    console.log(`   唯一订阅ID数: ${uniqueCsvIds.size}`);
    
    if (csvIds.length === uniqueCsvIds.size) {
      console.log('   ✅ CSV中所有订阅ID都是唯一的');
    } else {
      console.log('   ⚠️ CSV中存在重复的订阅ID');
    }

    // 3. 分析Stripe订阅机制
    console.log('\n💡 Stripe订阅机制分析:');
    console.log('   在Stripe中，同一个客户可以:');
    console.log('   1. 有多个不同的订阅 (不同价格ID)');
    console.log('   2. 每个订阅有唯一的订阅ID');
    console.log('   3. 订阅可以同时活跃');
    console.log('   4. 订阅可以升级/降级/取消');
    
    console.log('\n🎯 当前情况分析:');
    console.log('   根据CSV数据，用户有5个不同的订阅:');
    console.log('   - 3个Basic订阅 (相同价格ID，但不同订阅ID)');
    console.log('   - 1个Pro订阅');
    console.log('   - 1个Enterprise订阅');
    console.log('   这是正常的，因为每个订阅都有唯一的ID');

  } catch (error) {
    console.error('❌ 分析过程中出错:', error.message);
  }
}

analyzeSubscriptionDuplicates();

