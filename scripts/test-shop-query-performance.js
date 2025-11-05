// scripts/test-shop-query-performance.js
/**
 * Script to test and compare shop query performance
 * 
 * Usage: node scripts/test-shop-query-performance.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Shop = require('../src/models/Shop');

async function testQueryPerformance() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✓ Connected to MongoDB\n');
        console.log('🧪 Testing Shop Query Performance\n');
        console.log('='.repeat(70));

        // Test 1: Basic filtered query (most common)
        console.log('\n📊 Test 1: Filtered Query (isVerified=true, isActive=true)');
        console.log('-'.repeat(70));
        
        const start1 = Date.now();
        const result1 = await Shop.find({ isVerified: true, isActive: true })
            .select('_id name address isVerified isActive')
            .limit(20)
            .explain('executionStats');
        const time1 = Date.now() - start1;

        console.log(`⏱️  Execution time: ${time1}ms`);
        console.log(`📝 Documents examined: ${result1.executionStats.totalDocsExamined}`);
        console.log(`📦 Documents returned: ${result1.executionStats.nReturned}`);
        console.log(`🔍 Index used: ${result1.executionStats.executionStages.indexName || 'NONE (COLLSCAN)'}`);
        
        // Test 2: Aggregation pipeline (optimized approach)
        console.log('\n📊 Test 2: Aggregation Pipeline (Optimized)');
        console.log('-'.repeat(70));

        const start2 = Date.now();
        const pipeline = [
            { $match: { isVerified: true, isActive: true } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    shops: [
                        { $limit: 20 },
                        { $project: { _id: 1, name: 1, address: 1, isVerified: 1, isActive: 1 } }
                    ]
                }
            }
        ];
        
        const result2 = await Shop.aggregate(pipeline).allowDiskUse(true);
        const time2 = Date.now() - start2;

        const total = result2[0]?.metadata[0]?.total || 0;
        const returned = result2[0]?.shops?.length || 0;

        console.log(`⏱️  Execution time: ${time2}ms`);
        console.log(`📦 Total matching documents: ${total}`);
        console.log(`📦 Documents returned: ${returned}`);
        
        // Test 3: Query with location filter
        console.log('\n📊 Test 3: Location-Based Query');
        console.log('-'.repeat(70));

        const start3 = Date.now();
        const locationPipeline = [
            {
                $addFields: {
                    location: {
                        type: "Point",
                        coordinates: ["$longitude", "$latitude"]
                    }
                }
            },
            {
                $match: {
                    isActive: true,
                    isVerified: true,
                    location: {
                        $geoWithin: {
                            $centerSphere: [[31.5204, 74.3587], 50 / 6371] // Lahore, 50km radius
                        }
                    }
                }
            },
            { $limit: 20 }
        ];

        const result3 = await Shop.aggregate(locationPipeline).allowDiskUse(true);
        const time3 = Date.now() - start3;

        console.log(`⏱️  Execution time: ${time3}ms`);
        console.log(`📦 Documents returned: ${result3.length}`);

        // Test 4: Text search query
        console.log('\n📊 Test 4: Text Search Query');
        console.log('-'.repeat(70));

        const start4 = Date.now();
        const searchResult = await Shop.find({
            isVerified: true,
            isActive: true,
            $or: [
                { name: { $regex: 'barber', $options: 'i' } },
                { address: { $regex: 'barber', $options: 'i' } }
            ]
        })
        .select('_id name address')
        .limit(20)
        .explain('executionStats');
        const time4 = Date.now() - start4;

        console.log(`⏱️  Execution time: ${time4}ms`);
        console.log(`📝 Documents examined: ${searchResult.executionStats.totalDocsExamined}`);
        console.log(`📦 Documents returned: ${searchResult.executionStats.nReturned}`);

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📈 PERFORMANCE SUMMARY');
        console.log('='.repeat(70));
        console.log(`Test 1 (Basic Filter):       ${time1}ms`);
        console.log(`Test 2 (Optimized Pipeline): ${time2}ms`);
        console.log(`Test 3 (Location-Based):     ${time3}ms`);
        console.log(`Test 4 (Text Search):        ${time4}ms`);
        console.log('='.repeat(70));

        // Performance indicators
        console.log('\n🎯 OPTIMIZATION STATUS:');
        if (time1 < 100) {
            console.log('✅ Basic queries: EXCELLENT (<100ms)');
        } else if (time1 < 300) {
            console.log('✅ Basic queries: GOOD (<300ms)');
        } else {
            console.log('⚠️  Basic queries: NEEDS IMPROVEMENT (>300ms)');
        }

        if (time2 < 150) {
            console.log('✅ Aggregation queries: EXCELLENT (<150ms)');
        } else if (time2 < 400) {
            console.log('✅ Aggregation queries: GOOD (<400ms)');
        } else {
            console.log('⚠️  Aggregation queries: NEEDS IMPROVEMENT (>400ms)');
        }

        if (time3 < 200) {
            console.log('✅ Location queries: EXCELLENT (<200ms)');
        } else if (time3 < 500) {
            console.log('✅ Location queries: GOOD (<500ms)');
        } else {
            console.log('⚠️  Location queries: NEEDS IMPROVEMENT (>500ms)');
        }

        console.log('\n💡 RECOMMENDATIONS:');
        if (time1 > 200) {
            console.log('   - Consider running: node scripts/add-shop-indexes.js');
        }
        if (time2 > 300) {
            console.log('   - Enable MongoDB profiling to identify slow queries');
        }
        if (time3 > 400) {
            console.log('   - Verify 2dsphere index is created properly');
        }
        console.log('   - Monitor query patterns and adjust indexes accordingly');
        console.log('   - Consider implementing caching for frequently accessed queries');

        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run the tests
testQueryPerformance();
