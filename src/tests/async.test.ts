import { assert } from "chai";
import * as _ from "..";

describe("async module", () => {
  describe("asyncReduce function", () => {
    test("returns result of reducer", async () => {
      const numbers = [
        0,
        1,
        2,
        3,
        4, // => 10
      ];
      const asyncSum = async (a: number, b: number): Promise<number> => {
        return new Promise((res) => res(a + b));
      };
      const result = await _.reduce<number, number>(numbers, asyncSum, 0);
      assert.equal(result, 10);
    });
  });

  describe("asyncMap function", () => {
    test("returns result of mapper", async () => {
      const numbers = [1, 2, 3, 4];
      const asyncSquare = async (a: number): Promise<number> => {
        return new Promise((res) => res(a * a));
      };
      const result = await _.map<number, number>(numbers, asyncSquare);
      assert.deepEqual(result, [1, 4, 9, 16]);
    });
  });

  describe("reduce/asyncReduceV2 function", () => {
    const numbers = [0, 1, 2, 3, 4];
    const reducer = async (a: number, b: number): Promise<number> => {
      return new Promise((res) => res(a + b));
    };

    test("calls asyncReduce", async () => {
      const result = await _.reduce<number, number>(numbers, reducer, 0);
      assert.equal(result, 10);
    });
    test("uses first item in array when no init provided", async () => {
      const result = await _.reduce(numbers, reducer);
      assert.equal(result, 10);
    });
    test("throws on no init value and an empty array", async () => {
      try {
        await _.reduce([], reducer);
      } catch (err) {
        assert.isNotNull(err);
        return;
      }
      assert.fail("Expected error to be thrown");
    });
    test("throws on no init value and a null array input", async () => {
      try {
        await _.reduce(null, reducer);
      } catch (err) {
        assert.isNotNull(err);
        return;
      }
      assert.fail("Expected error to be thrown");
    });
  });

  describe("map/asyncMapV2 function", () => {
    test("calls asyncMap", async () => {
      const numbers = [1, 2, 3, 4];
      const asyncSquare = async (a: number): Promise<number> => {
        return new Promise((res) => res(a * a));
      };
      const result = await _.map<number, number>(numbers, asyncSquare);
      assert.deepEqual(result, [1, 4, 9, 16]);
    });
  });

  describe("defer function", () => {
    test("calls registered defer function", async () => {
      let val = 0;
      await _.defer(async (defer) => {
        defer(() => (val = 1));
      })
      assert.equal(val, 1);
    });
    test("returns the resulting value of the given function", async () => {
      let val = 0;
      const result = await _.defer(async (defer) => {
        defer(() => (val = 1));
        return "x";
      });
      assert.equal(val, 1);
      assert.equal(result, "x");
    });
    test("calls all registered defer functions", async () => {
      let one = 0;
      let two = 0;
      let three = 0;
      const result = await _.defer(async (defer) => {
        defer(() => (one = 1));
        defer(() => (two = 2));
        defer(() => (three = 3));
        return "x";
      })
      assert.equal(one, 1);
      assert.equal(two, 2);
      assert.equal(three, 3);
      assert.equal(result, "x");
    });
    test("calls all registered defer functions when error is thrown", async () => {
      let one = 0;
      let two = 0;
      let three = 0;
      try {
        await _.defer(async (defer) => {
          defer(() => (one = 1));
          defer(() => (two = 2));
          defer(() => (three = 3));
          if (!!true) throw new Error("soooo broken");
          return "x";
        });
      } catch {}
      assert.equal(one, 1);
      assert.equal(two, 2);
      assert.equal(three, 3);
    });
    test("rethrows the error", async () => {
      let error: Error | null = null;
      try {
        await _.defer(() => {
          throw new Error("soooo broken");
        });
      } catch (err) {
        error = err;
      }
      assert.isNotNull(error);
      assert.equal(error.message, "soooo broken");
    });
    test("returns awaited async results", async () => {
      const result = await _.defer(() => {
        return new Promise<string>((res) => res("x"));
      })
      assert.equal(result, "x");
    });
  });

  describe('_.try function', () => {
    test('returns error when error is thrown', async () => {
      const [err, result] = await _.try(async () => {
        throw new Error('not good enough')
      })()
      assert.isNull(result)
      assert.isNotNull(err)
      assert.equal(err.message, 'not good enough')
    })
    test('returns result when no error is thrown', async () => {
      const [err, result] = await _.try(async () => {
        return 'hello'
      })()
      assert.isNull(err)
      assert.isNotNull(result)
      assert.equal(result, 'hello')
    })
  })
  
  describe('_.sleep function', () => {
    test('returns error when error is thrown', async () => {
      const before = Date.now()
      await _.sleep(1000)
      const after = Date.now()
      assert.isAtLeast(after, before + 1000)
    })
  })
  
  describe('_.parallel function', () => {
    test('returns all results from all functions', async () => {
      const result = await _.parallel(1, _.list(1, 3), async (num) => {
        await _.sleep(1000)
        return `hi_${num}`
      })
      assert.deepEqual(result, [
        { error: null, result: 'hi_1' },
        { error: null, result: 'hi_2' },
        { error: null, result: 'hi_3' }
      ])
    })
    test('does not run more than the limit at once', async () => {
      let numInProgress = 0
      const tracking: number[] = []
      await _.parallel(3, _.list(1, 14), async () => {
        numInProgress++;
        tracking.push(numInProgress)
        await _.sleep(300)
        numInProgress--;
      })
      assert.deepEqual(tracking, [
        1, 2, 3, 
        3, 3, 3, 
        3, 3, 3, 
        3, 3, 3, 
        3, 3
      ])
    })
  })

  describe('_.retry', () => {
    test('returns result of given function', async () => {
      const result = await _.retry(async (bail) => { 
        return 'hello'
      })
      assert.equal(result, 'hello')
    })
    test('simple + quick + happy path', async () => {
      const result = await _.retry(async () => { 
        return 'hello'
      })
      assert.equal(result, 'hello')
    })
    test('retries on failure', async () => {
      let failedOnce = false
      const result = await _.retry(async (bail) => { 
        if (!failedOnce) {
          failedOnce = true
          throw 'Failing for test'
        }
        return 'hello'
      })
      assert.equal(result, 'hello')
    })
    test('quits on bail', async () => {
      try {
        await _.retry(async (bail) => { 
          bail('iquit')
        })
      } catch (err) {
        assert.equal(err, 'iquit')
        return
      }
      assert.fail('error should have been thrown')
    })
    test('quits after max retries', async () => {
      try {
        await _.retry(async () => { 
          throw 'quitagain'
        })
      } catch (err) {
        assert.equal(err, 'quitagain')
        return
      }
      assert.fail('error should have been thrown')
    })
    test('quits after max retries without delay', async () => {
      try {
        const func = async () => { 
          throw 'quitagain'
        }
        await _.retry(func, 3, null)
      } catch (err) {
        assert.equal(err, 'quitagain')
        return
      }
      assert.fail('error should have been thrown')
    })
  })

});