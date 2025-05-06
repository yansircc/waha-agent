/**
 * 使用 formsubmit.co
 * 1. 创建一个新邮件卡，询问用户邮箱地址，此时，formsubmit.co 会发送一封确认邮件到用户邮箱
 * 2. 用户点击确认邮件中的链接后，formsubmit.co 会生成一个 用户 email address 的别名
 * 3. 此时在用户提交了邮箱地址后，会询问用户的这个别名，用户输入别名后进入下一步
 * 4. 让用户填入 plunk 的 api key，告知用户这是为了用 plunk 来进行自动回复
 * 5. 让用户填入 wechat push 的 api key，告知用户这是为了用 wechat push 来进行自动回复
 * 6. 用户全部填写完成，保存邮件卡，如果用户没填完，用户退出之后，可以再次进入邮件卡，继续填写
 *
 * 注意：因为Email address 具备唯一性，且 Email address 对应的别名具备唯一性，所以需要对 Email address 和 Email address 进行强制存储（即使用户删除，也要强制存储）
 * 用户在新添加时，先检查 Email address 和别名是否存在，如果存在，则直接跳过第一步，否则视为新增邮件
 *
 * @see https://formsubmit.co/
 */

export default function NewEmailPage() {
	return <div>NewEmailPage</div>;
}
