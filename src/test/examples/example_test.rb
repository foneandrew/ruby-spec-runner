module MyModule
  class MyTest < TestCase
    setup do
      puts "shrug"
    end

    should "test things" do
      assert_equal 2, 1 + 1
    end

    should 'test things with different quotes' do
      assert_equal 2, 1 + 1
    end

    should "handle mixed quoatation marks 'n stuff" do
      assert_equal 2, 1 + 1
    end

    it "test things with an it" do
      assert_equal 2, 1 + 1
    end

    context "contexts work now!" do
      it('can handle brackets') do
        assert_equal 2, 1 + 1
      end

      context('Nested ones too!') {
        it("can use curlies") {
          assert_equal 2, 1 + 1
        }
      }

      def test_that_it_handles_functions
        assert_equal 2, 1 + 1
      end

      def test_that_it_handles_functions_with_brackets()
        assert_equal 2, 1 + 1
      end
    end
  end

  class SomeContext < MyTest
    should 'work with subclasses as contexts' do
      assert_equal 2, 1 + 1
    end

    describe "#whatever" do # comments are OK
      should "work with subclasses as contexts #2" do
        assert_equal 2, 1 + 1
      end
    end
  end
end
