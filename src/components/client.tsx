import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { DirectedGraph } from "graphology";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { circular } from "graphology-layout";

type NodeData = {
	addr: string,
	pred: string,
	succ: string,
	hash: number[],
}

type Message = {
	kind: "node data" | "haiku"
	data: NodeData[] | string
}

export const Client = () => {
	let { sendMessage, lastMessage, readyState } = useWebSocket("ws://0.0.0.0:3000/ws");

	const connectionStatus = {
		[ReadyState.CONNECTING]: 'Connecting',
		[ReadyState.OPEN]: 'Open',
		[ReadyState.CLOSING]: 'Closing',
		[ReadyState.CLOSED]: 'Closed',
		[ReadyState.UNINSTANTIATED]: 'Uninstantiated',
	}[readyState];

	const [graph, _] = useState(new DirectedGraph());
	const [nodeCount, setNodeCount] = useState(0);
	const [haikus, setHaikus] = useState<string[]>([]);
	useEffect(
		() => {
			if (lastMessage) {
				let n = 0;
				let lastMessageData: Message = JSON.parse(lastMessage?.data);
				console.log(lastMessageData.kind === "node data");
				if (lastMessageData.kind === "node data") {
					graph.clear();
					for (let node of lastMessageData.data as NodeData[]) {
						graph.mergeNode(node.addr, {
							x: 0,
							y: 0,
							label: node.addr,
							size: 15,
						});
						n += 1;
					}
					for (let node of lastMessageData.data as NodeData[]) {
						if (node.succ.length !== 0) {
							graph.mergeEdge(node.addr, node.succ);
						}
					}
					circular.assign(graph);
					setNodeCount(n);
				} else {
					setHaikus([...haikus, lastMessageData.data as string]);
				}
			}
		}, [lastMessage]
	);

	return (
		<div className="flex p-8 flex-row w-full h-full space-x-8 justify-between">
			<SigmaContainer className="border-2" />
			<div className="flex flex-col space-y-2 border-2">
				<p>{connectionStatus}</p>
				<p>node count: {nodeCount}</p>
				<Button onClick={() => sendMessage(JSON.stringify("Start"))} disabled={readyState !== ReadyState.OPEN}>send start message</Button>
				<Button onClick={() => sendMessage(JSON.stringify("AddNode"))} disabled={readyState !== ReadyState.OPEN}>add node</Button>
				<Button onClick={() => sendMessage(JSON.stringify("ClientSim"))}>client sim</Button>
			</div>
		</div>
	)

};

