RSpec.describe MyModule::MyClass do
  it 'is a test example' do
    expect(1 + 1).to be 2
  end

  it 'is a test with a keypair', flag: true do
    expect(1 + 1).to be 2
  end

  it 'is another test with a keypair', :flag => 'whatever' do
    expect(1 + 1).to be 2
  end

  it { expect(described_class).to be_a Class }

  context "Doesn't mind mixing quotations in a context" do
    it('handles the thing') { expect(1 + 1).to be 2 }
  end

  context 'is a context with a keypair', flag => false do
    it "Doesn't mind mixing quotations in an example" do
      expect(1 + 1).to be 2
    end
  end

  it "Doesn\"t mind mixing quotations again" do # and comments too
    expect(1 + 1).to be 2
  end

  it { expect(subject).to be_truthy }
end

describe MyModule::TestModule::MyClass, "for a test thingy" do
  it "is a test example" do # comments are alllll good
    expect(1 + 1).to be 2
  end

  it { expect(described_class).to be_a Class } # comments babyyyy
end

describe("A weird way to format a test") {
  context("Like who would do this?") {
    it("is a strange way to use rspec") { expect(1 + 1).to be 2 }
  }
}

describe 'A thing', request: true do # Comments agen
  it 'Is a skipped test and therefore should not have a code lens thingy...'
end

RSpec.describe Unio::Services::MemberDuesCalculator, "custom text", skip: :true, :skip2 => 'true' do # yolo swag comments
  context 'A thing', flag: false do # Comments agen
    it "is a test example", flag: false do # comments are alllll good
      expect(1 + 1).to be 2
    end
  end
end
