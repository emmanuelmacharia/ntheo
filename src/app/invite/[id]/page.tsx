import { getInviteById } from "~/server/actions/actions";
import InviteDetails from "../inviteDetails";

const InviteDetailsPage = async (props: {
  params: Promise<{ id: number }>;
}) => {
  const params = await props.params;
  console.log(typeof params.id, params.id);
  const parsedId = Number(params.id);
  const invite = await getInviteById(parsedId);

  return (
    <>
      <div className="text-center">
        <InviteDetails invite={invite} />
      </div>
    </>
  );
};

export default InviteDetailsPage;
