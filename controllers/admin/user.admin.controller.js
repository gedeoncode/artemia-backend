const User = require('../../models/User.model');

exports.getAllUsers = async (req, res) => {
  const search = req.query.search || '';
  const users = await User.find({
    $or: [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }).sort({ createdAt: -1 });

  res.json(users);
};

exports.blockUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
  res.json({ message: 'User blocked', user });
};

exports.unblockUser = async (req, res) => {
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(id, { isBlocked: false }, { new: true });
  res.json({ message: 'User unblocked', user });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.json({ message: 'User deleted' });
};
